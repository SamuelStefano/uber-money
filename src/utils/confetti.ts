import { CONFETTI_DELAY_MAX_MS, CONFETTI_DOT_COUNT, CONFETTI_PALETTE } from '@/consts/confetti'

export interface ConfettiDot {
  id: number
  left: number
  dx: number
  dy: number
  rot: number
  color: string
  delay: number
}

export function generateConfettiDots(count: number = CONFETTI_DOT_COUNT): ConfettiDot[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: 50 + (Math.random() - 0.5) * 30,
    dx: (Math.random() - 0.5) * 720,
    dy: -(220 + Math.random() * 360),
    rot: (Math.random() - 0.5) * 720,
    color: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
    delay: Math.random() * CONFETTI_DELAY_MAX_MS,
  }))
}
