import type { ReactNode, SVGProps, FC } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (children: ReactNode, size = 20): FC<IconProps> =>
  (p) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      {children}
    </svg>
  )

const ArrowRight = base(<path d="M5 12h14M13 5l7 7-7 7" />)
const ArrowLeft = base(<path d="M19 12H5M12 19l-7-7 7-7" />)
const Check: FC<IconProps> = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const CheckCircle = base(
  <>
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </>,
)
const Pix: FC<IconProps> = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M5.4 17.6l5.4-5.4a1.7 1.7 0 012.4 0l5.4 5.4-3 1.7-3.6-3.6-3.6 3.6-3-1.7zM18.6 6.4l-5.4 5.4a1.7 1.7 0 01-2.4 0L5.4 6.4l3-1.7L12 8.3l3.6-3.6 3 1.7zM21 12l-1.7-1-2.7 2.7a3.7 3.7 0 01-5.2 0L8.7 11l-1.7 1 1.7 1 2.7-2.7a3.7 3.7 0 015.2 0L19.3 13l1.7-1z" />
  </svg>
)
const Spark = base(
  <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />,
)
const Tire = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </>,
)
const Fuel = base(
  <>
    <path d="M3 22V4a2 2 0 012-2h8a2 2 0 012 2v18" />
    <path d="M3 14h12M14 9l4 4v6a2 2 0 01-2 2" />
    <path d="M18 5l3 3v9a1 1 0 01-2 0V8" />
  </>,
)
const Wrench = base(<path d="M14.7 6.3a4 4 0 014.5 5.7l-9.8 9.8a2 2 0 01-2.8-2.8l9.8-9.8a4 4 0 01-1.7-2.9z" />)
const Dots: FC<IconProps> = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
)
const Bell = base(<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M13.7 21a2 2 0 01-3.4 0" />)
const X = base(<path d="M18 6L6 18M6 6l12 12" />)
const Copy: FC<IconProps> = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const Shield: FC<IconProps> = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

export const Icon = {
  ArrowRight, ArrowLeft, Check, CheckCircle, Pix, Spark,
  Tire, Fuel, Wrench, Dots, Bell, X, Copy, Shield,
}

export type { IconProps }
