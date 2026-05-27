interface FooterChipProps {
  label: string
}

export function FooterChip({ label }: FooterChipProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 999,
      background: 'var(--canvas)', color: 'var(--ink)',
      fontSize: 11.5, fontWeight: 600,
      boxShadow: 'inset 0 0 0 1px var(--line)',
    }}>{label}</span>
  )
}
