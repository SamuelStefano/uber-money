interface SpinnerProps {
  size?: number
  color?: string
  strokeWidth?: number
}

export function Spinner({ size = 24, color = 'currentColor', strokeWidth = 2.4 }: SpinnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 900ms linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={strokeWidth} />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}
