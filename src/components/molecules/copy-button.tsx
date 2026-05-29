import { Icon } from '@/components/atoms/icon'
import { useToast } from '@/components/organisms/toast-provider'

interface CopyButtonProps {
  value: string
  label?: string
  size?: 'sm' | 'md'
}

export function CopyButton({ value, label = 'Copiar', size = 'md' }: CopyButtonProps) {
  const toast = useToast()
  const height = size === 'sm' ? 30 : 36
  const fontSize = size === 'sm' ? 12 : 13

  const onClick = () => {
    try {
      navigator.clipboard.writeText(value)
      toast.push(`${label} copiado`)
    } catch {
      toast.push('Não foi possível copiar')
    }
  }

  return (
    <button
      onClick={onClick}
      style={{
        height,
        padding: '0 14px',
        borderRadius: 10,
        background: '#F4F4F5',
        color: 'var(--ink)',
        fontWeight: 600,
        fontSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <Icon.Copy size={size === 'sm' ? 14 : 16} /> {label}
    </button>
  )
}
