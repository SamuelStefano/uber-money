interface WalletAvatarProps {
  size?: number
  rounded?: boolean
}

export function WalletAvatar({ size = 22, rounded = true }: WalletAvatarProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: rounded ? 999 : 12,
        background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)',
      }}
    />
  )
}
