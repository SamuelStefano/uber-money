interface BrandMarkProps {
  size?: number
  color?: string
}

export function BrandMark({ size = 36, color = '#0A0A0B' }: BrandMarkProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter Tight, Inter, sans-serif',
      fontWeight: 800, fontSize: size * 0.5, letterSpacing: '-0.04em',
    }}>
      <span style={{
        fontSize: size * 0.42, lineHeight: 1, position: 'relative',
        background: 'linear-gradient(180deg, #ffffff 0%, #c8ffe0 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>U$</span>
    </div>
  )
}
