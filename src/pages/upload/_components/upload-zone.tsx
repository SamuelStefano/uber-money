import { useRef, useState, type DragEvent } from 'react'
import { Icon } from '@/components/atoms/icon'
import { Spinner } from '@/components/atoms/spinner'

interface UploadZoneProps<T> {
  label: string
  hint: string
  onFile: (f: File) => void
  loading: boolean
  result: T | null
  renderResult: (d: T) => string
}

export function UploadZone<T>({ label, hint, onFile, loading, result, renderResult }: UploadZoneProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const done = !!result

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) onFile(f)
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      style={{
        minHeight: 220, borderRadius: 24, padding: 24, cursor: 'pointer',
        background: done ? 'var(--accent-soft)' : drag ? '#F7F7F5' : '#fff',
        boxShadow: done
          ? 'inset 0 0 0 2px var(--accent)'
          : drag
            ? 'inset 0 0 0 2px var(--ink)'
            : 'inset 0 0 0 1.4px var(--line)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transition: 'all 180ms ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</div>
          {done && (
            <span style={{
              width: 26, height: 26, borderRadius: 999,
              background: 'var(--accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#04140B',
            }}>
              <Icon.Check style={{ width: 16, height: 16 }} />
            </span>
          )}
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--mute)' }}>{hint}</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--mute)' }}>
          <Spinner size={18} /> <span>Lendo com IA…</span>
        </div>
      ) : done && result ? (
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{renderResult(result)}</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 32, color: 'var(--mute-2)' }}>+</span>
          <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>Arraste ou clique pra enviar</span>
        </div>
      )}
    </label>
  )
}
