/**
 * Attach Metaplex Token Metadata (name / symbol / logo) so wallets and explorers stop showing
 * "Unknown token".
 *   - index mints: via the program's `set_index_metadata` (Pot PDA is mint authority) — creator signs
 *   - test mints (tUSDC/tSOL/tBTC/tETH): direct CreateMetadataAccountV3 — admin is mint authority
 *
 *   npm run pot-index:metadata            # flagship + test mints
 *   npm run pot-index:metadata <indexMint> # one Pot
 *
 * Metadata JSON + logo are served from the web app at /token-meta/*.json (set $POT_INDEX_META_BASE).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js'
import idl from '../src/lib/pot-index/idl.json'
import registry from '../src/lib/pot-index/assets.devnet.json'
import { fetchPot, potPda } from '../src/lib/pot-index/client'

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_ADMIN_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const BASE = process.env.POT_INDEX_META_BASE ?? 'https://potbot-v2-git-feat-pot-index-y-dao.vercel.app/token-meta'
const TOKEN_METADATA = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

function metadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA.toBuffer(), mint.toBuffer()], TOKEN_METADATA)[0]
}

// Borsh-encode CreateMetadataAccountV3 by hand (avoids pulling the mpl SDK + its web3 2.x deps).
function createMetadataV3Ix(mint: PublicKey, authority: PublicKey, payer: PublicKey, name: string, symbol: string, uri: string) {
  const str = (s: string) => {
    const b = Buffer.from(s, 'utf8')
    const len = Buffer.alloc(4)
    len.writeUInt32LE(b.length)
    return Buffer.concat([len, b])
  }
  const data = Buffer.concat([
    Buffer.from([33]), // CreateMetadataAccountV3 discriminator
    str(name),
    str(symbol),
    str(uri),
    Buffer.from([0, 0]), // seller_fee_basis_points u16
    Buffer.from([0]), // creators: None
    Buffer.from([0]), // collection: None
    Buffer.from([0]), // uses: None
    Buffer.from([1]), // is_mutable
    Buffer.from([0]), // collection_details: None
  ])
  return new TransactionInstruction({
    programId: TOKEN_METADATA,
    keys: [
      { pubkey: metadataPda(mint), isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false }, // update authority
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  })
}

async function main() {
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
  const connection = new Connection(RPC, 'confirmed')
  const program = new Program(idl as Idl, new AnchorProvider(connection, new Wallet(admin), { commitment: 'confirmed' }))
  const only = process.argv[2]

  const pots = only ? [only] : [registry.flagship!]
  for (const m of pots) {
    const mint = new PublicKey(m)
    const pot = await fetchPot(connection, mint)
    if (!pot) throw new Error(`pot ${m} not found`)
    const md = metadataPda(mint)
    if (await connection.getAccountInfo(md)) {
      console.log('metadata exists for', pot.symbol)
      continue
    }
    const uri = `${BASE}/${pot.symbol.toLowerCase()}.json`
    const sig = await program.methods
      .setIndexMetadata(uri)
      .accounts({
        creator: admin.publicKey,
        pot: potPda(mint),
        indexMint: mint,
        metadata: md,
        tokenMetadataProgram: TOKEN_METADATA,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc()
    console.log('index metadata', pot.symbol, uri, sig)
  }

  if (only) return
  const tests: Array<[string, string, string]> = [
    [registry.usdcMint, 'Test USDC (PotBot devnet)', 'tUSDC'],
    ...Object.values(registry.assets).map((a) => [a.mint, `Test ${a.symbol} (PotBot devnet)`, `t${a.symbol}`] as [string, string, string]),
  ]
  for (const [m, name, symbol] of tests) {
    const mint = new PublicKey(m)
    if (await connection.getAccountInfo(metadataPda(mint))) {
      console.log('metadata exists for', symbol)
      continue
    }
    const uri = `${BASE}/${symbol.toLowerCase()}.json`
    const ix = createMetadataV3Ix(mint, admin.publicKey, admin.publicKey, name, symbol, uri)
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [admin])
    console.log('test metadata', symbol, sig)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
