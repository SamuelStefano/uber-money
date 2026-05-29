interface LockedCardCtaProps {
  heading: string
  caption: string
  onUnlock?: () => void
}

export function LockedCardCta({ heading, caption, onUnlock }: LockedCardCtaProps) {
  return (
    <button
      onClick={onUnlock}
      style={{
        marginTop: 8,
        padding: 0,
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: onUnlock ? 'pointer' : 'default',
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}
      >
        {heading}
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--mute)' }}>{caption}</div>
    </button>
  )
}
