import { useCallback, useState } from 'react'
import { Icon } from '@/components/atoms/icon'
import { useToast } from '@/components/organisms/toast-provider'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { useSolBalance } from '@/hooks/use-sol-balance'

interface WalletPillProps {
  address: string
  provider?: string
}

function fmtSol(sol: number | null): string {
  if (sol === null) return '—'
  if (sol >= 100) return sol.toFixed(2)
  if (sol >= 1) return sol.toFixed(3)
  return sol.toFixed(4)
}

export function WalletPill({ address, provider }: WalletPillProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useOutsideClick<HTMLDivElement>(open, close)
  const { sol, loading } = useSolBalance()

  if (!address) return null

  const short = `${address.slice(0, 4)}…${address.slice(-4)}`
  const copy = () => {
    try {
      navigator.clipboard.writeText(address)
      toast.push('Endereço copiado')
    } catch {
      toast.push('Não foi possível copiar')
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          height: 36, padding: '0 14px 0 10px', borderRadius: 999,
          background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)',
          fontSize: 13, fontWeight: 600, transition: 'background 140ms ease',
          border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 999, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />
        <span className="tabular" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>
          {loading && sol === null ? '—' : fmtSol(sol)}
        </span>
        <span style={{ color: 'var(--mute)', fontWeight: 500, fontSize: 11 }}>SOL</span>
        <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
        <span className="tabular" style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 12, color: 'var(--mute)' }}>{short}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
          background: '#fff', borderRadius: 18,
          boxShadow: '0 24px 48px -12px rgba(10,10,15,0.22), inset 0 0 0 1px var(--line)',
          padding: 16, zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 12, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Carteira Solana</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500 }}>External · {provider || 'Phantom'}</div>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--accent-soft)', color: 'var(--accent-deep)',
              fontSize: 11, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
              Conectada
            </span>
          </div>

          <div style={{
            marginTop: 14, padding: '14px 14px',
            borderRadius: 14, background: 'var(--canvas)',
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Saldo on-chain
              </div>
              <div className="tabular" style={{ marginTop: 4, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                {fmtSol(sol)} <span style={{ fontSize: 14, color: 'var(--mute)', fontWeight: 600 }}>SOL</span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)' }}>devnet</span>
          </div>

          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 12,
            background: 'var(--canvas)',
            fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
            fontSize: 11.5, wordBreak: 'break-all',
          }}>{address}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{ flex: 1, height: 36, borderRadius: 10, background: '#F4F4F5', color: 'var(--ink)', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: 'pointer' }}>
              <Icon.Copy /> Copiar
            </button>
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, height: 36, borderRadius: 10, textDecoration: 'none', background: '#F4F4F5', color: 'var(--ink)', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Ver explorer
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
