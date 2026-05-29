import { useState } from 'react'
import { Sheet } from '@/components/molecules/sheet'
import { Button } from '@/components/atoms/button'
import { Field } from '@/components/atoms/field'
import { Icon } from '@/components/atoms/icon'
import type { PixKeyType } from '@/lib/api'

interface PixKeyModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (pixKey: string, pixKeyType: PixKeyType) => void
  amountBRL: number
  defaultKey?: string
  defaultType?: PixKeyType
}

const TYPES: { id: PixKeyType; label: string; placeholder: string }[] = [
  { id: 'cpf',   label: 'CPF',      placeholder: '000.000.000-00' },
  { id: 'email', label: 'E-mail',   placeholder: 'voce@email.com' },
  { id: 'phone', label: 'Celular',  placeholder: '+55 11 9 0000-0000' },
  { id: 'evp',   label: 'Aleatória', placeholder: 'chave-evp-uuid' },
]

function validate(value: string, type: PixKeyType): boolean {
  if (type === 'cpf')   return value.replace(/\D/g, '').length === 11
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  if (type === 'phone') return value.replace(/\D/g, '').length >= 10
  if (type === 'evp')   return value.trim().length >= 30
  return false
}

export function PixKeyModal({ open, onClose, onConfirm, amountBRL, defaultKey, defaultType }: PixKeyModalProps) {
  const [type, setType] = useState<PixKeyType>(defaultType ?? 'cpf')
  const [key, setKey] = useState(defaultKey ?? '')
  const valid = validate(key, type)

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: 28, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600, marginBottom: 6 }}>Pra onde mandar?</div>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Receba R$ {amountBRL.toFixed(2).replace('.', ',')}
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--mute)' }}>
          Informe sua chave Pix. Vamos salvar pra próxima vez.
        </p>

        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setType(t.id); setKey('') }}
              style={{
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                background: type === t.id ? 'var(--ink)' : '#fff',
                color: type === t.id ? '#fff' : 'var(--ink)',
                border: type === t.id ? '1px solid var(--ink)' : '1px solid var(--line)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <Field
            label="Chave Pix"
            value={key}
            onChange={setKey}
            placeholder={TYPES.find((t) => t.id === type)?.placeholder}
            inputMode={type === 'cpf' || type === 'phone' ? 'numeric' : 'text'}
          />
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Button
            variant="accent"
            size="lg"
            disabled={!valid}
            onClick={() => onConfirm(key.trim(), type)}
            icon={<Icon.Pix />}
            style={{ minWidth: 280 }}
          >
            Confirmar e receber
          </Button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--mute)', fontWeight: 500, padding: '6px 12px',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  )
}
