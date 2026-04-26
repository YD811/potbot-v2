type ExplorerCluster = 'mainnet' | 'devnet'

function withDevnetCluster(url: string, cluster: ExplorerCluster): string {
  if (cluster !== 'devnet') return url
  return `${url}?cluster=devnet`
}

export function solscanTx(sig: string, cluster: ExplorerCluster = 'mainnet'): string {
  return withDevnetCluster(`https://solscan.io/tx/${sig}`, cluster)
}

export function solscanAccount(addr: string, cluster: ExplorerCluster = 'mainnet'): string {
  return withDevnetCluster(`https://solscan.io/account/${addr}`, cluster)
}

export function solscanToken(mint: string, cluster: ExplorerCluster = 'mainnet'): string {
  return withDevnetCluster(`https://solscan.io/token/${mint}`, cluster)
}

export function heliusTx(sig: string): string {
  return `https://xray.helius.xyz/tx/${sig}`
}
