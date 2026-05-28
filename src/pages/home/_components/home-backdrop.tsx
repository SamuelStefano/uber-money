import { motion } from 'framer-motion'

// BG da home — papel quente como base + aurora drift visível + grid sutil + 2 beams.
export function HomeBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'linear-gradient(180deg, #F4F0E8 0%, #ECE7DD 100%)',
      }} />

      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -140, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(720px 540px at 18% 18%, rgba(0,194,110,0.22) 0%, transparent 60%),
            radial-gradient(640px 480px at 86% 28%, rgba(120,148,255,0.20) 0%, transparent 60%),
            radial-gradient(780px 600px at 70% 95%, rgba(255,176,71,0.18) 0%, transparent 60%)
          `,
        }}
        animate={{ x: [0, 30, -18, 0], y: [0, -22, 14, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(8,8,10,0.06) 0.5px, transparent 0.5px)',
        backgroundSize: '26px 26px',
        backgroundPosition: '-1px -1px',
        maskImage: 'radial-gradient(circle at 50% 40%, black 0%, black 50%, transparent 92%)',
      }} />

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.03, mixBlendMode: 'multiply',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.88' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'absolute', left: 0, right: 0, top: '34%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.55,
        }}
      >
        <motion.line
          x1="0" y1="1" x2="100%" y2="1"
          stroke="url(#um-beam-1)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
        <defs>
          <linearGradient id="um-beam-1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,194,110,0)" />
            <stop offset="50%" stopColor="rgba(0,194,110,0.75)" />
            <stop offset="100%" stopColor="rgba(0,194,110,0)" />
          </linearGradient>
        </defs>
      </motion.svg>

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'absolute', left: 0, right: 0, top: '72%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.4,
        }}
      >
        <motion.line
          x1="100%" y1="1" x2="0" y2="1"
          stroke="url(#um-beam-2)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 4, delay: 2.2 }}
        />
        <defs>
          <linearGradient id="um-beam-2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(120,148,255,0)" />
            <stop offset="50%" stopColor="rgba(120,148,255,0.65)" />
            <stop offset="100%" stopColor="rgba(120,148,255,0)" />
          </linearGradient>
        </defs>
      </motion.svg>
    </>
  )
}
