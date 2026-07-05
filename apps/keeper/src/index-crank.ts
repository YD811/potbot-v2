// Index-vault keeper cranks: NAV snapshot (60s) + redemption-queue settler.
//
// Custody model: the keeper key is ONLY a crank identity — the program lets
// it write NAV snapshots (deviation-capped) and shuttle funds between
// vault-owned accounts. It has no instruction that can pay anyone but a
// requester's own ATA. Fund it with gas SOL only.
//
// Key material comes from KEEPER_KEYPAIR_PATH (file) or KEEPER_KEYPAIR_JSON
// (raw array, e.g. from a secret manager env) — never from the repo.
//
// NAV pricing, current phase: BOOK VALUE — idle base buffer + Σ position
// cost bases. This is exact while routes hold base units in escrow
// (receipt == deployed). When Kamino/Meteora adapters land, price legs here
// via their SDKs + Jupiter Price API v2 and keep everything else unchanged.

import { AnchorProvider, BorshAccountsCoder, Program, Wallet, BN } from '@coral-xyz/anchor'
import type { Idl } from '@coral-xyz/anchor'
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from '@solana/web3.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const NAV_INTERVAL_MS = Number(process.env.KEEPER_NAV_INTERVAL_MS ?? 60_000)
const MAX_SETTLES_PER_TICK = Number(process.env.KEEPER_MAX_SETTLES_PER_TICK ?? 5)
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

function loadIdl(): Idl {
  return JSON.parse(readFileSync(join(__dirname, 'idl', 'pot_vault.json'), 'utf8')) as Idl
}

/** Account discriminator straight from the IDL (anchor 0.30 removed the
 *  static BorshAccountsCoder.accountDiscriminator). */
function discOf(idl: any, name: string): Uint8Array {
  const acc = idl.accounts.find((a: any) => a.name === name)
  if (!acc) throw new Error(`account ${name} not in IDL`)
  return Uint8Array.from(acc.discriminator)
}

function loadKeeperKeypair(): Keypair | null {
  const path = process.env.KEEPER_KEYPAIR_PATH
  const json = process.env.KEEPER_KEYPAIR_JSON
  try {
    if (json) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json)))
    if (path) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8'))))
  } catch (e) {
    console.error('[index-crank] failed to load keeper keypair:', e)
  }
  return null
}

const pda = (seeds: (Buffer | Uint8Array)[], programId: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, programId)[0]

const ata = (mint: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM_ID,
  )[0]

const createAtaIdempotentIx = (payer: PublicKey, mint: PublicKey, owner: PublicKey) =>
  new TransactionInstruction({
    programId: ATA_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata(mint, owner), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  })

async function withBackoff<T>(label: string, fn: () => Promise<T>, tries = 3): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e: any) {
      const wait = 1_000 * 2 ** i
      console.warn(`[index-crank] ${label} failed (attempt ${i + 1}/${tries}): ${e.message ?? e}`)
      if (i < tries - 1) await new Promise((r) => setTimeout(r, wait))
    }
  }
  return null
}

export interface IndexCrankMetrics {
  navTicks: number
  navUpdates: number
  settles: number
  lastError: string | null
}

export const indexCrankMetrics: IndexCrankMetrics = {
  navTicks: 0,
  navUpdates: 0,
  settles: 0,
  lastError: null,
}

export function startIndexCrank(programId: PublicKey): void {
  const keeper = loadKeeperKeypair()
  if (!keeper) {
    console.log('[index-crank] no keeper keypair configured — NAV/settle cranks disabled')
    return
  }

  const connection = new Connection(RPC_URL, 'confirmed')
  const provider = new AnchorProvider(connection, new Wallet(keeper), { commitment: 'confirmed' })
  const rawIdl = loadIdl()
  const program = new Program(rawIdl as any, provider)
  const coder = new BorshAccountsCoder(loadIdl())
  console.log(`[index-crank] started — keeper ${keeper.publicKey.toBase58()}, every ${NAV_INTERVAL_MS}ms`)

  let running = false

  const tick = async () => {
    if (running) return // idempotency: never overlap ticks
    running = true
    indexCrankMetrics.navTicks++
    try {
      // 1. find every pot with an index layer this keeper serves
      const configDisc = discOf(rawIdl, 'StrategyConfig')
      const configs = await connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 0, bytes: bs58encode(configDisc) } }],
      })

      for (const { account } of configs) {
        const cfg: any = coder.decode('StrategyConfig', account.data)
        if (!cfg.keeper.equals(keeper.publicKey)) continue

        const pot = new PublicKey(cfg.pot)
        const baseMint = new PublicKey(cfg.baseMint)
        const vault = pda([Buffer.from('vault'), pot.toBuffer()], programId)
        const config = pda([Buffer.from('strategy'), pot.toBuffer()], programId)

        // 2. book NAV = idle buffer + Σ position cost bases
        let idle = 0n
        try {
          const bal = await connection.getTokenAccountBalance(ata(baseMint, vault))
          idle = BigInt(bal.value.amount)
        } catch { /* vault ATA not created yet */ }

        const posDisc = discOf(rawIdl, 'StrategyPosition')
        const positions = await connection.getProgramAccounts(programId, {
          filters: [
            { memcmp: { offset: 0, bytes: bs58encode(posDisc) } },
            { memcmp: { offset: 8, bytes: pot.toBase58() } },
          ],
        })
        let deployed = 0n
        for (const { account: pa } of positions) {
          const pos: any = coder.decode('StrategyPosition', pa.data)
          deployed += BigInt(pos.deployedBase.toString())
        }
        const nav = idle + deployed

        // 3. write the snapshot (program enforces deviation + monotonicity)
        const ok = await withBackoff(`nav ${pot.toBase58().slice(0, 8)}`, () =>
          (program as any).methods
            .updateNavSnapshot(new BN(nav.toString()))
            .accounts({ pot, config, keeper: keeper.publicKey })
            .rpc(),
        )
        if (ok) {
          indexCrankMetrics.navUpdates++
          console.log(`[index-crank] NAV ${pot.toBase58().slice(0, 8)}… = ${nav} base units (idle ${idle} + deployed ${deployed})`)
        }

        // 4. settle pending redemptions the buffer can now serve
        const reqDisc = discOf(rawIdl, 'RedeemRequest')
        const requests = await connection.getProgramAccounts(programId, {
          filters: [
            { memcmp: { offset: 0, bytes: bs58encode(reqDisc) } },
            { memcmp: { offset: 8, bytes: pot.toBase58() } },
          ],
        })
        const indexMint = pda([Buffer.from('index_mint'), pot.toBuffer()], programId)
        let settled = 0
        for (const { pubkey, account: ra } of requests) {
          if (settled >= MAX_SETTLES_PER_TICK) break // rate limit per tick
          const req: any = coder.decode('RedeemRequest', ra.data)
          if (!('pending' in req.status)) continue
          const member = new PublicKey(req.member)
          const tx = new Transaction().add(
            createAtaIdempotentIx(keeper.publicKey, baseMint, member),
            await (program as any).methods
              .settleRedeem()
              .accounts({
                pot, config, vault,
                vaultBaseAta: ata(baseMint, vault),
                vaultIndexAta: ata(indexMint, vault),
                indexMint, baseMint,
                request: pubkey, member,
                memberBaseAta: ata(baseMint, member),
                cranker: keeper.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
              })
              .instruction(),
          )
          const sig = await withBackoff(`settle ${pubkey.toBase58().slice(0, 8)}`, () =>
            provider.sendAndConfirm(tx),
          )
          if (sig) {
            settled++
            indexCrankMetrics.settles++
            console.log(`[index-crank] settled redeem ${pubkey.toBase58().slice(0, 8)}… → ${member.toBase58().slice(0, 8)}… (${sig.slice(0, 12)}…)`)
          }
          // InsufficientVault / stale-NAV settles just retry next tick.
        }
      }
      indexCrankMetrics.lastError = null
    } catch (e: any) {
      indexCrankMetrics.lastError = String(e.message ?? e)
      console.error('[index-crank] tick failed:', e)
    } finally {
      running = false
    }
  }

  void tick()
  setInterval(() => void tick(), NAV_INTERVAL_MS).unref()
}

// Minimal base58 encode (avoids adding a dependency for one call site).
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function bs58encode(buf: Uint8Array): string {
  let n = 0n
  for (const b of buf) n = (n << 8n) | BigInt(b)
  let out = ''
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out
    n /= 58n
  }
  for (const b of buf) {
    if (b !== 0) break
    out = '1' + out
  }
  return out
}
