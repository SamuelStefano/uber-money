import { useState, type HTMLInputTypeAttribute, type InputHTMLAttributes, type ReactNode } from 'react'

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: HTMLInputTypeAttribute
  suffix?: ReactNode
  prefix?: ReactNode
  autoFocus?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}

export function Field({
  label, value, onChange, placeholder, type = 'text', suffix, prefix, autoFocus, inputMode,
}: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{
        height: 54, borderRadius: 14, background: '#fff',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        boxShadow: focused ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 1.2px var(--line)',
        transition: 'box-shadow 140ms ease',
      }}>
        {prefix ? <span style={{ color: 'var(--mute)', marginRight: 8, fontWeight: 500 }}>{prefix}</span> : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
