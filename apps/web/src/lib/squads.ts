import * as squads from '@sqds/multisig'
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

const DEFAULT_SQUADS_PROGRAM_ID = squads.PROGRAM_ID
const VAULT_INDEX = 0

export type SquadsWalletSigner = {
  publicKey: PublicKey
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
}

function getSquadsProgramId(): PublicKey {
  const override = process.env.NEXT_PUBLIC_SQUADS_PROGRAM_ID?.trim()
  if (!override) return DEFAULT_SQUADS_PROGRAM_ID

  try {
    return new PublicKey(override)
  } catch {
    return DEFAULT_SQUADS_PROGRAM_ID
  }
}

export async function getMultisigForCreator(
  creator: PublicKey,
  connection: Connection,
): Promise<PublicKey | null> {
  const programId = getSquadsProgramId()

  const multisigs = await squads.accounts.Multisig.gpaBuilder(programId).run(connection)
  for (const account of multisigs) {
    const multisigPda = account.pubkey
    const [vaultPda] = squads.getVaultPda({ multisigPda, index: VAULT_INDEX, programId })
    if (vaultPda.equals(creator)) {
      return multisigPda
    }
  }

  return null
}

export async function isSquadsVault(addr: PublicKey, connection: Connection): Promise<boolean> {
  const multisigPda = await getMultisigForCreator(addr, connection)
  return multisigPda !== null
}

export function buildSquadsTransactionUrl(multisigPda: PublicKey, txIndex: number): string {
  return `https://app.squads.so/squads/${multisigPda.toBase58()}/transactions/${txIndex}`
}

export async function proposeViaSquads({
  multisig,
  instruction,
  signer,
  connection,
}: {
  multisig: PublicKey
  instruction: TransactionInstruction
  signer: SquadsWalletSigner
  connection: Connection
}): Promise<{ txIndex: number; signature: string }> {
  const programId = getSquadsProgramId()
  const multisigAccount = await squads.accounts.Multisig.fromAccountAddress(connection, multisig)
  const txIndex = Number(multisigAccount.transactionIndex)
  const transactionIndex = BigInt(txIndex)
  const [vaultPda] = squads.getVaultPda({ multisigPda: multisig, index: VAULT_INDEX, programId })

  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const vaultTxMsg = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash,
    instructions: [instruction],
  })

  const vaultTx = squads.transactions.vaultTransactionCreate({
    blockhash: recentBlockhash,
    feePayer: signer.publicKey,
    multisigPda: multisig,
    transactionIndex,
    creator: signer.publicKey,
    vaultIndex: VAULT_INDEX,
    ephemeralSigners: 0,
    transactionMessage: vaultTxMsg,
    programId,
  })

  const signedVaultTx = await signer.signTransaction(vaultTx)
  const createSignature = await connection.sendRawTransaction(signedVaultTx.serialize())
  await connection.confirmTransaction(createSignature, 'confirmed')

  const proposalTx = squads.transactions.proposalCreate({
    blockhash: (await connection.getLatestBlockhash()).blockhash,
    feePayer: signer.publicKey,
    multisigPda: multisig,
    transactionIndex,
    creator: signer.publicKey,
    programId,
  })
  const signedProposalTx = await signer.signTransaction(proposalTx)
  await connection.sendRawTransaction(signedProposalTx.serialize())

  const approveTx = squads.transactions.proposalApprove({
    blockhash: (await connection.getLatestBlockhash()).blockhash,
    feePayer: signer.publicKey,
    multisigPda: multisig,
    transactionIndex,
    member: signer.publicKey,
    programId,
  })
  const signedApproveTx = await signer.signTransaction(approveTx)
  const approveSignature = await connection.sendRawTransaction(signedApproveTx.serialize())
  await connection.confirmTransaction(approveSignature, 'confirmed')

  return { txIndex, signature: approveSignature }
}
