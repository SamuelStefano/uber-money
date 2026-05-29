interface TxLinkProps {
  hash: string
  cluster?: 'devnet' | 'mainnet'
  short?: boolean
}

export function TxLink({ hash, cluster = 'devnet', short = false }: TxLinkProps) {
  const display = short ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : hash
  const href = `https://explorer.solana.com/tx/${hash}${cluster === 'devnet' ? '?cluster=devnet' : ''}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
        fontSize: 12,
        color: 'var(--accent-deep)',
        wordBreak: 'break-all',
      }}
    >
      {display}
    </a>
  )
}
