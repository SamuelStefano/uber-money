import type { ReactNode } from 'react'

interface PageHeadingProps {
  children: ReactNode
  subtitle?: ReactNode
  size?: 'lg' | 'xl'
  className?: string
}

const styles = {
  xl: {
    fontSize: 'clamp(44px, 5.5vw, 56px)',
    fontWeight: 800,
    letterSpacing: '-0.035em',
    lineHeight: 1.05,
  },
  lg: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.05,
  },
} as const

export function PageHeading({ children, subtitle, size = 'xl', className }: PageHeadingProps) {
  return (
    <header className={className}>
      <h1 className="tight" style={{ margin: 0, ...styles[size] }}>
        {children}
      </h1>
      {subtitle && (
        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--mute)', margin: '12px 0 0' }}>
          {subtitle}
        </p>
      )}
    </header>
  )
}
