import { FooterChip } from '@/components/atoms/footer-chip'

export function Footer() {
  return (
    <footer style={{
      height: 48, flexShrink: 0, padding: '0 32px',
      borderTop: '1px solid var(--line)', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, color: 'var(--mute)', position: 'relative', zIndex: 90,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999,
          background: 'var(--accent)',
          boxShadow: '0 0 0 3px rgba(0,194,110,0.18)',
        }} />
        <span style={{ fontWeight: 500 }}>Tudo operando · sandbox</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontWeight: 500 }}>Powered by</span>
        <FooterChip label="Phantom" />
        <FooterChip label="Woovi" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--mute-2)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>v0.1 · hackathon</span>
      </div>
    </footer>
  )
}
