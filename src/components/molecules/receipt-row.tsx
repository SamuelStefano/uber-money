interface ReceiptRowProps {
  label: string
  value: string
  sub?: string
  mono?: boolean
  last?: boolean
}

export function ReceiptRow({ label, value, sub, mono, last }: ReceiptRowProps) {
  return (
    <div style={{
      padding: '14px 0',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{label}</div>
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--ink)',
          letterSpacing: '-0.01em',
          fontFamily: mono ? 'ui-monospace, SF Mono, Menlo, monospace' : undefined,
          wordBreak: 'break-all',
        }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--mute-2)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}
