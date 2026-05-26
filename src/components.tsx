// @ts-nocheck
// components.tsx — shared UI primitives.
import React, { useEffect, useRef, useState, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, BRL, BRL_PARTS } from './services'

// ─── Icons ──────────────────────────────────────────────────────
export const Icon = {
  ArrowRight: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
  ),
  ArrowLeft: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  ),
  Check: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>
  ),
  CheckCircle: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
  ),
  Pix: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M5.4 17.6l5.4-5.4a1.7 1.7 0 012.4 0l5.4 5.4-3 1.7-3.6-3.6-3.6 3.6-3-1.7zM18.6 6.4l-5.4 5.4a1.7 1.7 0 01-2.4 0L5.4 6.4l3-1.7L12 8.3l3.6-3.6 3 1.7zM21 12l-1.7-1-2.7 2.7a3.7 3.7 0 01-5.2 0L8.7 11l-1.7 1 1.7 1 2.7-2.7a3.7 3.7 0 015.2 0L19.3 13l1.7-1z"/></svg>
  ),
  Spark: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>
  ),
  Tire: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
  ),
  Fuel: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><path d="M3 14h12M14 9l4 4v6a2 2 0 01-2 2"/><path d="M18 5l3 3v9a1 1 0 01-2 0V8"/></svg>
  ),
  Wrench: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4 4 0 014.5 5.7l-9.8 9.8a2 2 0 01-2.8-2.8l9.8-9.8a4 4 0 01-1.7-2.9z"/></svg>
  ),
  Dots: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
  ),
  Bell: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M13.7 21a2 2 0 01-3.4 0"/></svg>
  ),
  X: (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>
  ),
  Copy: (p: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
  ),
  Shield: (p: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
}

export function BrandMark({ size = 36, color = '#0A0A0B' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter Tight, Inter, sans-serif',
      fontWeight: 800, fontSize: size * 0.5, letterSpacing: '-0.04em',
    }}>
      <span style={{
        fontSize: size * 0.42, lineHeight: 1, position: 'relative',
        background: 'linear-gradient(180deg, #ffffff 0%, #c8ffe0 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>U$</span>
    </div>
  )
}

export function Spinner({ size = 24, color = 'currentColor', strokeWidth = 2.4 }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 900ms linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={strokeWidth}/>
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled, full, loading, size = 'lg', icon, style }: any) {
  const base = {
    height: size === 'lg' ? 56 : size === 'md' ? 48 : 40,
    borderRadius: size === 'lg' ? 18 : 14,
    fontWeight: 600, fontSize: size === 'lg' ? 17 : 15,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '0 22px', width: full ? '100%' : undefined,
    transition: 'transform 120ms ease, background 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
    letterSpacing: '-0.01em',
  }
  const variants: any = {
    primary: {
      background: disabled ? '#E5E5E5' : 'var(--ink)',
      color: disabled ? '#A3A3AA' : '#fff',
      boxShadow: disabled ? 'none' : '0 2px 0 rgba(0,0,0,0.04), 0 8px 24px -8px rgba(10,10,15,0.35)',
    },
    accent: {
      background: disabled ? '#E5E5E5' : 'var(--accent)',
      color: disabled ? '#A3A3AA' : '#04140B',
      boxShadow: disabled ? 'none' : 'var(--shadow-glow)',
    },
    secondary: {
      background: '#F4F4F5', color: 'var(--ink)',
      boxShadow: 'inset 0 0 0 1px var(--line)',
    },
    ghost: { background: 'transparent', color: 'var(--ink)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={(e: any) => { if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.985)' }}
      onMouseUp={(e: any) => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{ ...base, ...variants[variant], ...(style || {}), opacity: 1, cursor: disabled || loading ? 'not-allowed' : 'pointer' }}
    >
      {loading ? <Spinner size={20} color={variant === 'primary' ? '#fff' : '#04140B'} /> : (
        <>
          {icon ? <span style={{ display: 'flex' }}>{icon}</span> : null}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}

export function AppFrame({ children }: any) {
  const [s] = useStore()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopNav user={s.user} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
      <Footer />
    </div>
  )
}

function TopNav({ user }: any) {
  return (
    <header style={{
      height: 64, flexShrink: 0, padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--line)', background: '#fff',
      position: 'relative', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandMark size={30} />
        <span className="tight" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Uber Money</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <WalletPill address={user.walletAddress} provider={user.walletProvider} />
            <div style={{ width: 1, height: 26, background: 'var(--line)' }}/>
            <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{user.name}</span>
            <Avatar name={user.name} size={36} />
          </>
        ) : null}
      </div>
    </header>
  )
}

function WalletPill({ address, provider }: any) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<any>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  if (!address) return null
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`
  const copy = () => { try { navigator.clipboard.writeText(address); toast.push('Endereço copiado') } catch {} }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        height: 36, padding: '0 14px 0 10px', borderRadius: 999,
        background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)',
        fontSize: 13, fontWeight: 600, transition: 'background 140ms ease',
      }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />
        <span style={{ color: 'var(--mute)', fontWeight: 500, fontSize: 12 }}>Solana</span>
        <span className="tabular" style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 12.5 }}>{short}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: '#fff', borderRadius: 18, boxShadow: '0 24px 48px -12px rgba(10,10,15,0.22), inset 0 0 0 1px var(--line)', padding: 16, zIndex: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 12, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Carteira Solana</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500 }}>External · {provider || 'Phantom'}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-deep)', fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
              Conectada
            </span>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--canvas)', fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 11.5, wordBreak: 'break-all' }}>{address}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{ flex: 1, height: 36, borderRadius: 10, background: '#F4F4F5', color: 'var(--ink)', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon.Copy /> Copiar
            </button>
            <a href={`https://explorer.solana.com/address/${address}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ flex: 1, height: 36, borderRadius: 10, textDecoration: 'none', background: '#F4F4F5', color: 'var(--ink)', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Ver explorer
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function Footer() {
  return (
    <footer style={{
      height: 48, flexShrink: 0, padding: '0 32px',
      borderTop: '1px solid var(--line)', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, color: 'var(--mute)', position: 'relative', zIndex: 90,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(0,194,110,0.18)' }} />
        <span style={{ fontWeight: 500 }}>Tudo operando · devnet</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontWeight: 500 }}>Powered by</span>
        <FooterChip label="Solana" />
        <FooterChip label="Chainlink" />
        <FooterChip label="Phantom" />
        <FooterChip label="Woovi" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--mute-2)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>v0.1 · hackathon</span>
      </div>
    </footer>
  )
}

function FooterChip({ label }: any) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, background: 'var(--canvas)', color: 'var(--ink)', fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)' }}>{label}</span>
  )
}

function Avatar({ name = 'Samuel', size = 40 }: any) {
  const initials = name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: 'linear-gradient(135deg, #2A2A2E 0%, #0A0A0B 100%)', color: '#fff', fontWeight: 700, fontSize: size * 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.01em' }}>{initials}</div>
  )
}

export function Screen({ children, label, scroll = false, style }: any) {
  return (
    <div data-screen-label={label} className={scroll ? 'app-scroll' : ''} style={{ position: 'absolute', inset: 0, overflow: scroll ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
      {children}
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────
const ToastContext = createContext<any>({ push: () => {} })
export function ToastProvider({ children }: any) {
  const [toasts, setToasts] = useState<any[]>([])
  const push = (msg: string, opts: any = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, ...opts }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 2400)
  }
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ background: 'rgba(10,10,15,0.92)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 12px 36px -6px rgba(0,0,0,0.35)' }}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)

export function Chip({ label, icon, active, onClick, size = 'md' }: any) {
  const h = size === 'lg' ? 52 : 40
  return (
    <button onClick={onClick} style={{
      height: h, padding: size === 'lg' ? '0 18px' : '0 14px',
      borderRadius: 999, fontSize: size === 'lg' ? 16 : 14, fontWeight: 600,
      background: active ? 'var(--ink)' : '#fff',
      color: active ? '#fff' : 'var(--ink)',
      boxShadow: active ? '0 6px 16px -6px rgba(10,10,15,0.35)' : 'inset 0 0 0 1.2px var(--line)',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      transition: 'all 160ms ease', letterSpacing: '-0.01em',
    }}>
      {icon ? <span style={{ display: 'flex', opacity: active ? 1 : 0.7 }}>{icon}</span> : null}
      {label}
    </button>
  )
}

export function Field({ label, value, onChange, placeholder, type = 'text', suffix, prefix, autoFocus, inputMode }: any) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ height: 54, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', boxShadow: focused ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 1.2px var(--line)', transition: 'box-shadow 140ms ease' }}>
        {prefix ? <span style={{ color: 'var(--mute)', marginRight: 8, fontWeight: 500 }}>{prefix}</span> : null}
        <input
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={inputMode}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, height: '100%', border: 'none', background: 'transparent', fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}
        />
        {suffix ? <span style={{ color: 'var(--mute)', marginLeft: 8, fontWeight: 500 }}>{suffix}</span> : null}
      </div>
    </label>
  )
}

export function Money({ value, size = 64, weight = 800, color = 'var(--ink)', symbolSize, centsSize, tabular = true, animateKey }: any) {
  const { symbol, whole, cents } = BRL_PARTS(Math.max(0, value))
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, color, fontFamily: 'Inter Tight, Inter, sans-serif', fontWeight: weight, letterSpacing: '-0.03em', lineHeight: 1 }} className={tabular ? 'tabular' : ''} key={animateKey}>
      <span style={{ fontSize: symbolSize || size * 0.5, fontWeight: 600, letterSpacing: '-0.02em' }}>{symbol}</span>
      <span style={{ fontSize: size }}>{whole}</span>
      <span style={{ fontSize: centsSize || size * 0.36, fontWeight: 600 }}>,{cents}</span>
    </div>
  )
}

export function Card({ children, style, padded = true, dark = false }: any) {
  return (
    <div style={{
      background: dark ? 'var(--ink)' : '#fff',
      color: dark ? '#fff' : 'var(--ink)',
      borderRadius: 24,
      padding: padded ? 20 : 0,
      boxShadow: dark ? '0 12px 36px -8px rgba(10,10,15,0.35), 0 1px 0 rgba(255,255,255,0.04) inset' : 'var(--shadow-md), inset 0 0 0 1px var(--line-2)',
      ...style,
    }}>{children}</div>
  )
}

export function Sheet({ open, onClose, children }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,15,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={onClose}>
          <motion.div
            initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            onClick={(e: any) => e.stopPropagation()}
            style={{ width: '100%', background: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 36, maxHeight: '88%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
              <div style={{ width: 38, height: 5, borderRadius: 100, background: '#E5E5E7' }} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
