import type { CSSProperties, ReactNode } from 'react'
import type { FonteRenda, Negativacao, StatusVeiculo } from '@/types/api'

interface ProfileValue {
  tempo_uber_meses: number | null
  dias_semana: number | null
  corridas_semana: number | null
  fonte_renda: FonteRenda | null
  nota_motorista: number | null
  status_veiculo: StatusVeiculo | null
  negativacao: Negativacao | null
}

interface ProfilePickerProps {
  value: ProfileValue
  onChange: (patch: Partial<ProfileValue>) => void
}

interface Option<T> {
  value: T
  label: string
}

const TEMPO_OPTS: Option<number>[] = [
  { value: 3, label: 'Menos de 3 meses' },
  { value: 5, label: '3 a 6 meses' },
  { value: 9, label: '6 a 12 meses' },
  { value: 24, label: '1 a 3 anos' },
  { value: 48, label: '3+ anos' },
]

const DIAS_OPTS: Option<number>[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
]

const CORRIDAS_OPTS: Option<number>[] = [
  { value: 10, label: 'Menos de 15' },
  { value: 22, label: '15 a 30' },
  { value: 40, label: '30 a 50' },
  { value: 60, label: '50+' },
]

const FONTE_OPTS: Option<FonteRenda>[] = [
  { value: 'so_uber', label: 'Não, só Uber' },
  { value: 'uber_secundaria', label: 'Sim, Uber é secundária' },
  { value: 'uber_principal', label: 'Sim, mas Uber é principal' },
]

const VEICULO_OPTS: Option<StatusVeiculo>[] = [
  { value: 'proprio', label: 'Próprio' },
  { value: 'financiado', label: 'Financiado' },
  { value: 'alugado', label: 'Alugado' },
]

const NEGATIVACAO_OPTS: Option<Negativacao>[] = [
  { value: 'nao', label: 'Não' },
  { value: 'ja_teve', label: 'Já teve' },
  { value: 'sim', label: 'Sim, ativo' },
]

function ChipChoice<T extends string | number>({
  options, value, onChange,
}: { options: Option<T>[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            style={{
              height: 40, padding: '0 14px', borderRadius: 999,
              fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              background: active ? 'var(--ink)' : '#fff',
              color: active ? '#fff' : 'var(--ink)',
              boxShadow: active ? '0 6px 16px -6px rgba(10,10,15,0.35)' : 'inset 0 0 0 1.2px var(--line)',
              transition: 'all 160ms ease',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function CriteriaCard({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      padding: 20, borderRadius: 22, background: '#fff',
      boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--line-2)',
      display: 'flex', flexDirection: 'column', gap: 12,
      ...style,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</div>
      {children}
    </div>
  )
}

export function ProfilePicker({ value, onChange }: ProfilePickerProps) {
  return (
    <div style={{
      marginTop: 24,
      display: 'grid', gap: 16,
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    }}>
      <CriteriaCard title="Há quanto é motorista?">
        <ChipChoice options={TEMPO_OPTS} value={value.tempo_uber_meses} onChange={(v) => onChange({ tempo_uber_meses: v })} />
      </CriteriaCard>

      <CriteriaCard title="Dias por semana?">
        <ChipChoice options={DIAS_OPTS} value={value.dias_semana} onChange={(v) => onChange({ dias_semana: v })} />
      </CriteriaCard>

      <CriteriaCard title="Corridas por semana?">
        <ChipChoice options={CORRIDAS_OPTS} value={value.corridas_semana} onChange={(v) => onChange({ corridas_semana: v })} />
      </CriteriaCard>

      <CriteriaCard title="Tem outra fonte de renda?">
        <ChipChoice options={FONTE_OPTS} value={value.fonte_renda} onChange={(v) => onChange({ fonte_renda: v })} />
      </CriteriaCard>

      <CriteriaCard title="Nota média?">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={1}
          max={5}
          value={value.nota_motorista ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') { onChange({ nota_motorista: null as unknown as number }); return }
            const n = Number(raw)
            if (Number.isFinite(n)) onChange({ nota_motorista: n })
          }}
          placeholder="Ex: 4.85"
          style={{
            height: 52, borderRadius: 14, background: '#fff',
            padding: '0 16px', border: 'none',
            boxShadow: 'inset 0 0 0 1.2px var(--line)',
            fontSize: 17, fontWeight: 600, color: 'var(--ink)',
            letterSpacing: '-0.01em', outline: 'none',
          }}
        />
      </CriteriaCard>

      <CriteriaCard title="Veículo">
        <ChipChoice options={VEICULO_OPTS} value={value.status_veiculo} onChange={(v) => onChange({ status_veiculo: v })} />
      </CriteriaCard>

      <CriteriaCard title="Nome negativado?" style={{ gridColumn: 'span 1' }}>
        <ChipChoice options={NEGATIVACAO_OPTS} value={value.negativacao} onChange={(v) => onChange({ negativacao: v })} />
      </CriteriaCard>
    </div>
  )
}

export type { ProfileValue }
