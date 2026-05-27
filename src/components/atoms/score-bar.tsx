interface ScoreBarProps {
  value: number
}

export function ScoreBar({ value }: ScoreBarProps) {
  return (
    <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: '#EEE', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${value}%`,
        background: 'linear-gradient(90deg, var(--ink) 0%, var(--accent) 100%)',
        borderRadius: 999,
      }} />
    </div>
  )
}
