import type { ComponentType, SVGProps } from 'react'
import {
  ArrowRight, ArrowLeft, Check, CheckCircle, Sparkles, Disc3,
  Fuel, Wrench, MoreHorizontal, Bell, X, Copy, Shield,
} from 'lucide-react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string }
type IconComp = ComponentType<IconProps>

const Pix: IconComp = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M5.4 17.6l5.4-5.4a1.7 1.7 0 012.4 0l5.4 5.4-3 1.7-3.6-3.6-3.6 3.6-3-1.7zM18.6 6.4l-5.4 5.4a1.7 1.7 0 01-2.4 0L5.4 6.4l3-1.7L12 8.3l3.6-3.6 3 1.7zM21 12l-1.7-1-2.7 2.7a3.7 3.7 0 01-5.2 0L8.7 11l-1.7 1 1.7 1 2.7-2.7a3.7 3.7 0 015.2 0L19.3 13l1.7-1z" />
  </svg>
)

export const Icon = {
  ArrowRight, ArrowLeft, Check, CheckCircle, Pix,
  Spark: Sparkles,
  Tire: Disc3,
  Fuel, Wrench,
  Dots: MoreHorizontal,
  Bell, X, Copy, Shield,
}

export type { IconProps }
