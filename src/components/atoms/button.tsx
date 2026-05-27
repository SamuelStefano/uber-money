import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Spinner } from './spinner'

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  full?: boolean
  icon?: ReactNode
  style?: CSSProperties
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 }
const SIZE_RADIUS: Record<ButtonSize, number> = { sm: 14, md: 14, lg: 18 }
const SIZE_FONT: Record<ButtonSize, number> = { sm: 15, md: 15, lg: 17 }

function variantStyle(variant: ButtonVariant, disabled: boolean): CSSProperties {
  if (variant === 'primary') return {
    background: disabled ? '#E5E5E5' : 'var(--ink)',
    color: disabled ? '#A3A3AA' : '#fff',
    boxShadow: disabled ? 'none' : '0 2px 0 rgba(0,0,0,0.04), 0 8px 24px -8px rgba(10,10,15,0.35)',
  }
  if (variant === 'accent') return {
    background: disabled ? '#E5E5E5' : 'var(--accent)',
    color: disabled ? '#A3A3AA' : '#04140B',
    boxShadow: disabled ? 'none' : 'var(--shadow-glow)',
  }
  if (variant === 'secondary') return {
    background: '#F4F4F5', color: 'var(--ink)',
    boxShadow: 'inset 0 0 0 1px var(--line)',
  }
  return { background: 'transparent', color: 'var(--ink)' }
}

export function Button({
  children, variant = 'primary', size = 'lg', loading, full, icon, disabled, style, ...rest
}: ButtonProps) {
  const isOff = disabled || loading
  const base: CSSProperties = {
    height: SIZE_HEIGHT[size],
    borderRadius: SIZE_RADIUS[size],
    fontWeight: 600, fontSize: SIZE_FONT[size],
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '0 22px', width: full ? '100%' : undefined,
    transition: 'transform 120ms ease, background 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
    letterSpacing: '-0.01em',
    cursor: isOff ? 'not-allowed' : 'pointer',
    opacity: 1,
  }
  return (
    <button
      {...rest}
      disabled={isOff}
      onMouseDown={(e) => { if (!isOff) e.currentTarget.style.transform = 'scale(0.985)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{ ...base, ...variantStyle(variant, !!disabled), ...(style ?? {}) }}
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

export type { ButtonProps }
