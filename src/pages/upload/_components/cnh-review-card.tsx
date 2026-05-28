import { useEffect, useState } from 'react'
import { Icon } from '@/components/atoms/icon'
import { validateCpf, formatCpf } from '@/utils/validate-cpf'
import type { CnhData } from '@/types/documents'

interface CnhReviewCardProps {
  data: CnhData
  file: File | null
  analyzing: boolean
  onReanalyze: () => void
  onDelete: () => void
}

function formatDateBR(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function CnhReviewCard({ data, file, analyzing, onReanalyze, onDelete }: CnhReviewCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const cpfValid = validateCpf(data.cpf)
  const confidence = data.confidence ?? 'medium'
  const confColor = confidence === 'high' && cpfValid ? 'var(--accent)' : confidence === 'medium' ? '#F5A623' : '#D04F4F'
  const confLabel = !cpfValid
    ? 'CPF não validou — reenvie ou analise de novo'
    : confidence === 'high' ? 'Leitura com alta confiança'
    : confidence === 'medium' ? 'Confiança média'
    : 'Confiança baixa'

  const isPdf = file?.type === 'application/pdf'

  return (
    <div style={{
      borderRadius: 24, padding: 22,
      background: '#fff', boxShadow: 'inset 0 0 0 1.4px var(--accent)',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>Sua CNH</div>
          <div style={{
            marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: confColor,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: confColor }} />
            {confLabel}
          </div>
        </div>
        <span style={{
          width: 26, height: 26, borderRadius: 999,
          background: cpfValid ? 'var(--accent)' : 'rgba(220,60,60,0.10)',
          color: cpfValid ? '#04140B' : '#B23A3A',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {cpfValid ? <Icon.Check style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 14, fontWeight: 800 }}>!</span>}
        </span>
      </div>

      {previewUrl && (
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          background: 'var(--canvas)', border: '1px solid var(--line)',
          minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPdf ? (
            <iframe
              src={previewUrl}
              title="CNH PDF"
              style={{ width: '100%', height: 200, border: 'none' }}
            />
          ) : (
            <img
              src={previewUrl}
              alt="CNH"
              style={{ maxWidth: '100%', maxHeight: 200, display: 'block' }}
            />
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Info label="Nome" value={data.name ?? '—'} />
        <Info label="CPF" value={data.cpf ? formatCpf(data.cpf) : '—'} mono />
        <Info label="Validade" value={formatDateBR(data.valid_until)} />
        <Info label="Categoria" value={data.category ?? '—'} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onReanalyze}
          disabled={analyzing || !file}
          style={{
            flex: 1, height: 44, borderRadius: 12,
            background: 'rgba(10,10,15,0.04)', color: 'var(--ink)',
            border: '1px solid var(--line)', cursor: analyzing ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {analyzing ? 'Analisando…' : 'Analisar novamente'}
        </button>
        <button
          onClick={onDelete}
          disabled={analyzing}
          style={{
            flex: 1, height: 44, borderRadius: 12,
            background: 'rgba(220,60,60,0.06)', color: '#B23A3A',
            border: '1px solid rgba(220,60,60,0.18)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          Excluir e reenviar
        </button>
      </div>
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mute)',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--ink)', wordBreak: 'break-word',
        fontFamily: mono ? 'ui-monospace, SF Mono, Menlo, monospace' : 'inherit',
      }}>
        {value}
      </div>
    </div>
  )
}
