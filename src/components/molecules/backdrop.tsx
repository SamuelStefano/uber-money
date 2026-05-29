import { motion } from 'framer-motion'

type BackdropVariant = 'home' | 'login-hero' | 'login-panel'

interface BackdropProps {
  variant?: BackdropVariant
  className?: string
}

interface BeamConfig {
  top: string
  direction: 'ltr' | 'rtl'
  gradientId: string
  color: string
  peakAlpha: number
  opacity: number
  duration: number
  repeatDelay: number
  delay?: number
}

interface VariantConfig {
  base?: string
  aurora: string
  auroraInset: number
  auroraAnimate: { x: number[]; y: number[] }
  auroraDuration: number
  grid?: {
    dotAlpha: number
    maskFocus: string
  }
  grain?: {
    opacity: number
  }
  beams: BeamConfig[]
}

const VARIANTS: Record<BackdropVariant, VariantConfig> = {
  home: {
    base: 'linear-gradient(180deg, #EEF1F2 0%, #E5EAEE 100%)',
    aurora: `
      radial-gradient(760px 580px at 14% 16%, rgba(20,241,149,0.30) 0%, transparent 60%),
      radial-gradient(680px 520px at 88% 24%, rgba(153,69,255,0.24) 0%, transparent 60%),
      radial-gradient(820px 620px at 70% 96%, rgba(46,124,255,0.22) 0%, transparent 60%)
    `,
    auroraInset: -160,
    auroraAnimate: { x: [0, 36, -22, 0], y: [0, -26, 16, 0] },
    auroraDuration: 30,
    grid: {
      dotAlpha: 0.05,
      maskFocus: 'circle at 50% 40%, black 0%, black 50%, transparent 92%',
    },
    grain: { opacity: 0.03 },
    beams: [
      {
        top: '34%',
        direction: 'ltr',
        gradientId: 'um-beam-green',
        color: '20,241,149',
        peakAlpha: 0.85,
        opacity: 0.55,
        duration: 5.5,
        repeatDelay: 3,
      },
      {
        top: '60%',
        direction: 'rtl',
        gradientId: 'um-beam-purple',
        color: '153,69,255',
        peakAlpha: 0.65,
        opacity: 0.45,
        duration: 7,
        repeatDelay: 4,
        delay: 2.2,
      },
      {
        top: '82%',
        direction: 'ltr',
        gradientId: 'um-beam-blue',
        color: '46,124,255',
        peakAlpha: 0.65,
        opacity: 0.35,
        duration: 6.5,
        repeatDelay: 4,
        delay: 4.4,
      },
    ],
  },
  'login-hero': {
    aurora: `
      radial-gradient(620px 480px at 18% 22%, rgba(0,194,110,0.28) 0%, transparent 60%),
      radial-gradient(580px 420px at 80% 18%, rgba(153,69,255,0.16) 0%, transparent 60%),
      radial-gradient(700px 540px at 60% 95%, rgba(255,176,71,0.22) 0%, transparent 60%)
    `,
    auroraInset: -120,
    auroraAnimate: { x: [0, 24, -18, 0], y: [0, -18, 12, 0] },
    auroraDuration: 28,
    grid: {
      dotAlpha: 0.055,
      maskFocus: 'circle at 30% 50%, black 0%, black 60%, transparent 92%',
    },
    grain: { opacity: 0.025 },
    beams: [
      {
        top: '38%',
        direction: 'ltr',
        gradientId: 'um-beam-login-hero',
        color: '0,194,110',
        peakAlpha: 0.65,
        opacity: 0.45,
        duration: 6,
        repeatDelay: 3,
      },
    ],
  },
  'login-panel': {
    aurora: `
      radial-gradient(560px 420px at 80% 20%, rgba(0,194,110,0.18) 0%, transparent 60%),
      radial-gradient(500px 380px at 20% 80%, rgba(120,148,255,0.16) 0%, transparent 60%)
    `,
    auroraInset: -120,
    auroraAnimate: { x: [0, -20, 14, 0], y: [0, 14, -10, 0] },
    auroraDuration: 24,
    beams: [],
  },
}

const GRAIN_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.88' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

export function Backdrop({ variant = 'home', className }: BackdropProps) {
  const cfg = VARIANTS[variant]

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
    >
      {cfg.base && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: cfg.base,
        }} />
      )}

      <motion.div
        style={{
          position: 'absolute', inset: cfg.auroraInset, pointerEvents: 'none', zIndex: 0,
          background: cfg.aurora,
        }}
        animate={cfg.auroraAnimate}
        transition={{ duration: cfg.auroraDuration, repeat: Infinity, ease: 'linear' }}
      />

      {cfg.grid && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `radial-gradient(rgba(8,8,10,${cfg.grid.dotAlpha}) 0.5px, transparent 0.5px)`,
          backgroundSize: '26px 26px',
          backgroundPosition: '-1px -1px',
          maskImage: `radial-gradient(${cfg.grid.maskFocus})`,
          WebkitMaskImage: `radial-gradient(${cfg.grid.maskFocus})`,
        }} />
      )}

      {cfg.grain && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          opacity: cfg.grain.opacity, mixBlendMode: 'multiply',
          backgroundImage: GRAIN_SVG,
        }} />
      )}

      {cfg.beams.map((beam) => (
        <motion.svg
          key={beam.gradientId}
          width="100%" height="2"
          style={{
            position: 'absolute', left: 0, right: 0, top: beam.top,
            pointerEvents: 'none', zIndex: 0, opacity: beam.opacity,
          }}
        >
          <motion.line
            x1={beam.direction === 'ltr' ? '0' : '100%'} y1="1"
            x2={beam.direction === 'ltr' ? '100%' : '0'} y2="1"
            stroke={`url(#${beam.gradientId})`} strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
            transition={{
              duration: beam.duration,
              repeat: Infinity,
              ease: 'linear',
              repeatDelay: beam.repeatDelay,
              delay: beam.delay ?? 0,
            }}
          />
          <defs>
            <linearGradient id={beam.gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={`rgba(${beam.color},0)`} />
              <stop offset="50%" stopColor={`rgba(${beam.color},${beam.peakAlpha})`} />
              <stop offset="100%" stopColor={`rgba(${beam.color},0)`} />
            </linearGradient>
          </defs>
        </motion.svg>
      ))}
    </div>
  )
}
