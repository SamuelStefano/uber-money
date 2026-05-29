export interface QrCodeDisplayProps {
  src: string
  size?: number
  alt?: string
}

export function QrCodeDisplay({ src, size = 200, alt = 'QR Code Pix' }: QrCodeDisplayProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ borderRadius: 12, background: '#fff', padding: 12, display: 'block' }}
    />
  )
}
