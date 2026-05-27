import { motion } from 'framer-motion'
import { Money } from '@/components/atoms/money'
import { Chip } from '@/components/atoms/chip'
import { AMOUNT_CHIPS, AMOUNT_MAX, AMOUNT_MIN, AMOUNT_STEP } from '@/consts/credit'
import { AmountSlider } from './amount-slider'

interface AmountPickerProps {
  value: number
  onChange: (v: number) => void
}

export function AmountPicker({ value, onChange }: AmountPickerProps) {
  return (
    <div style={{
      marginTop: 36, padding: '40px 32px', borderRadius: 28, background: '#fff',
      boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--line-2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
    }}>
      <motion.div
        key={value}
        initial={{ scale: 0.92, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 320 }}
      >
        <Money value={value} size={112} symbolSize={48} centsSize={40} weight={800} />
      </motion.div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <AmountSlider value={value} onChange={onChange} min={AMOUNT_MIN} max={AMOUNT_MAX} step={AMOUNT_STEP} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--mute-2)', fontWeight: 500 }}>
          <span>R$ {AMOUNT_MIN}</span><span>R$ {AMOUNT_MAX}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {AMOUNT_CHIPS.map((v) => (
          <Chip key={v} label={`R$${v}`} active={value === v} onClick={() => onChange(v)} />
        ))}
      </div>
    </div>
  )
}
