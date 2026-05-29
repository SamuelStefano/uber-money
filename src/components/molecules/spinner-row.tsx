import { Spinner } from '@/components/atoms/spinner'

interface SpinnerRowProps {
  label: string
}

export function SpinnerRow({ label }: SpinnerRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Spinner size={40} />
      <span style={{ fontSize: 15, color: 'var(--mute)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}
