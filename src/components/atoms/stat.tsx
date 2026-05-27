interface StatProps {
  label: string
  value: string
}

export function Stat({ label, value }: StatProps) {
  return (
    <div>
      <div className="tight tabular" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--mute)', fontWeight: 500, marginTop: 2, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
