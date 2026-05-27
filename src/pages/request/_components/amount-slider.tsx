interface AmountSliderProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}

export function AmountSlider({ value, onChange, min, max, step }: AmountSliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 999, background: '#E9E9EB' }} />
      <div style={{
        position: 'absolute', left: 0, height: 10, borderRadius: 999,
        background: 'linear-gradient(90deg, var(--ink) 0%, var(--accent) 100%)',
        width: `${pct}%`,
      }} />
      <div style={{
        position: 'absolute', left: `calc(${pct}% - 16px)`,
        width: 32, height: 32, borderRadius: 999, background: '#fff',
        boxShadow: '0 4px 12px -2px rgba(10,10,15,0.25), inset 0 0 0 1px var(--line)',
        pointerEvents: 'none',
      }} />
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: 40, opacity: 0, cursor: 'grab' }}
      />
    </div>
  )
}
