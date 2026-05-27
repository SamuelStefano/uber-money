import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastOptions {
  duration?: number
}

interface ToastItem {
  id: string
  msg: string
}

interface ToastApi {
  push: (msg: string, opts?: ToastOptions) => void
}

const ToastContext = createContext<ToastApi>({ push: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((msg: string, opts: ToastOptions = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration ?? 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: 'rgba(10,10,15,0.92)', color: '#fff',
            padding: '10px 16px', borderRadius: 12,
            fontSize: 14, fontWeight: 500,
            boxShadow: '0 12px 36px -6px rgba(0,0,0,0.35)',
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
