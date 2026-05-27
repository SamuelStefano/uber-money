import type { CSSProperties, ReactNode } from 'react'

interface ScreenProps {
  children: ReactNode
  label?: string
  scroll?: boolean
  style?: CSSProperties
}

export function Screen({ children, label, scroll = false, style }: ScreenProps) {
  return (
    <div
      data-screen-label={label}
      className={scroll ? 'app-scroll' : ''}
      style={{
        position: 'absolute', inset: 0,
        overflow: scroll ? 'auto' : 'hidden',
        display: 'flex', flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
