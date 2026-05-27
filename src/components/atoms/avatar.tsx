import { initialsOf } from '@/utils/initials'

interface AvatarProps {
  name?: string
  size?: number
}

export function Avatar({ name = 'Samuel', size = 40 }: AvatarProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: 'linear-gradient(135deg, #2A2A2E 0%, #0A0A0B 100%)',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: '-0.01em',
    }}>{initialsOf(name)}</div>
  )
}
