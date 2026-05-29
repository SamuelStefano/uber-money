import { useState } from 'react'
import { Sheet } from '@/components/molecules/sheet'
import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { validateCpf, formatCpf } from '@/utils/validate-cpf'
import type { CnhData } from '@/types/documents'

interface CnhReviewSheetProps {
  open: boolean
  data: CnhData | null
  onConfirm: (data: CnhData) => void
  onReupload: () => void
}

export function CnhReviewSheet({ open, data, onConfirm, onReupload }: CnhReviewSheetProps) {
  const initialCpf = data?.cpf ?? ''
  const [name, setName] = useState(data?.name ?? '')
  const [cpf, setCpf] = useState(formatCpf(initialCpf))
  const [validUntil, setValidUntil] = useState(data?.valid_until ?? '')

  const cpfValid = validateCpf(cpf)
  const ready = cpfValid && name.trim().length >= 4
  const confidence = data?.confidence ?? 'unknown'
  const confColor = confidence === 'high' ? 'var(--accent)' : confidence === 'medium' ? '#F5A623' : '#D04F4F'
  const confLabel = confidence === 'high' ? 'Alta confiança' : confidence === 'medium' ? 'Confiança média' : 'Confiança baixa'

  return (
    <Sheet open={open} onClose={() => { /* não fecha clicando fora — exige decisão */ }}>
      <div style={{ padding: 28, maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px 5px 8px', borderRadius: 999,
          background: 'rgba(10,10,15,0.04)', border: '1px solid var(--line)',
          fontSize: 11, fontWeight: 600, color: 'var(--mute)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: confColor }} />
          {confLabel}
        </div>
        <h2 style={{ margin: '14px 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Os dados estão corretos?
        </h2>
        <p style={{ marginTop: 0, fontSize: 14, color: 'var(--mute)' }}>
          Lemos sua CNH. Confere antes de seguir.
        </p>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nome completo" value={name} onChange={setName} />
          <div>
            <Field
              label="CPF"
              value={cpf}
              onChange={(v) => setCpf(formatCpf(v))}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
            {cpf.length === 14 && (
              <div style={{ marginTop: 6, fontSize: 12, color: cpfValid ? 'var(--accent-deep)' : '#B23A3A', fontWeight: 600 }}>
                {cpfValid ? '✓ CPF válido' : '✗ CPF inválido — confere o dígito'}
              </div>
            )}
          </div>
          <Field label="Validade da CNH" value={validUntil} onChange={setValidUntil} placeholder="AAAA-MM-DD" />
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <Button
            variant="accent"
            size="lg"
            disabled={!ready}
            onClick={() => onConfirm({
              ...(data ?? { name: null, cpf: null, birth_date: null, valid_until: null, category: null, confidence: 'medium' }),
              name: name.trim(),
              cpf: cpf.replace(/\D/g, ''),
              valid_until: validUntil || null,
            })}
            icon={<Icon.CheckCircle />}
            style={{ minWidth: 280 }}
          >
            Confirmar e continuar
          </Button>
          <button
            onClick={onReupload}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--mute)', fontWeight: 500, padding: '6px 12px',
            }}
          >
            Enviar outra foto da CNH
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function Field({ label, value, onChange, placeholder, inputMode }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric'
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mute)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode ?? 'text'}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          border: '1px solid var(--line)', background: '#fff',
          fontSize: 15, fontWeight: 500, outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}
