import type { Key } from 'react'
import { BRL_PARTS } from '@/utils/format'

interface MoneyProps {
  value: number
  size?: number
  weight?: number
  color?: string
  symbolSize?: number
  centsSize?: number
  tabular?: boolean
  animateKey?: Key
}

export function Money({
  value, size = 64, weight = 800, color = 'var(--ink)',
  symbolSize, centsSize, tabular = true, animateKey,
}: MoneyProps) {
  const { symbol, whole, cents } = BRL_PARTS(Math.max(0, value))
  return (
    <div
      key={animateKey}
      className={tabular ? 'tabular' : ''}
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
        color, fontFamily: 'Inter Tight, Inter, sans-serif',
        fontWeight: weight, letterSpacing: '-0.03em', lineHeight: 1,
      }}
    >
      <span style={{ fontSize: symbolSize ?? size * 0.5, fontWeight: 600, letterSpacing: '-0.02em' }}>{symbol}</span>
      <span style={{ fontSize: size }}>{whole}</span>
      <span style={{ fontSize: centsSize ?? size * 0.36, fontWeight: 600 }}>,{cents}</span>
    </div>
  )
}
