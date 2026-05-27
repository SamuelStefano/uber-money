import { Card } from '@/components/atoms/card'
import { ScoreBar } from '@/components/atoms/score-bar'

interface ScoreCardProps {
  value: number
  caption: string
}

export function ScoreCard({ value, caption }: ScoreCardProps) {
  return (
    <Card padded style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Seu score</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span className="tight tabular" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</span>
        <span style={{ fontSize: 18, color: 'var(--mute)', fontWeight: 600 }}>/100</span>
      </div>
      <ScoreBar value={value} />
      <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>{caption}</div>
    </Card>
  )
}
