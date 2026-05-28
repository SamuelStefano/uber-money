import { Card } from '@/components/atoms/card'
import { ScoreBar } from '@/components/atoms/score-bar'

interface ScoreCardProps {
  value: number | null
  caption: string
  onUnlock?: () => void
}

export function ScoreCard({ value, caption, onUnlock }: ScoreCardProps) {
  const locked = value === null
  const displayValue = locked ? 0 : Math.round((value / 1000) * 100)

  return (
    <Card padded style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Seu score</div>
      </div>
      {locked ? (
        <button
          onClick={onUnlock}
          style={{
            marginTop: 10, padding: 0, background: 'transparent', border: 'none',
            textAlign: 'left', cursor: onUnlock ? 'pointer' : 'default',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Solicite crédito pra ver seu score
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--mute)' }}>{caption}</div>
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span className="tight tabular" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>{displayValue}</span>
            <span style={{ fontSize: 18, color: 'var(--mute)', fontWeight: 600 }}>/100</span>
          </div>
          <ScoreBar value={displayValue} />
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>{caption}</div>
        </>
      )}
    </Card>
  )
}
