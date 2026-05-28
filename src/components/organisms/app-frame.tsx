import type { ReactNode } from 'react'
import { TopNav } from './top-nav'

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--canvas)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <TopNav />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
    </div>
  )
}
