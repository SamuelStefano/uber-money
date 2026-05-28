import { motion } from 'framer-motion'

// BG da home — aurora drift + grid de pontos + beam horizontal animado.
// Pegada: "presente sem ser carnaval".
export function HomeBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'linear-gradient(180deg, #FBFBF8 0%, #F6F6F2 100%)',
      }} />

      <motion.div
        aria-hidden
        style={{
          position: 'fixed', inset: -120, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(620px 480px at 20% 18%, rgba(0,194,110,0.16) 0%, transparent 60%),
            radial-gradient(540px 420px at 88% 30%, rgba(120,148,255,0.14) 0%, transparent 60%),
            radial-gradient(700px 540px at 70% 95%, rgba(255,176,71,0.12) 0%, transparent 60%)
          `,
          filter: 'blur(0px)',
        }}
        animate={{
          x: [0, 28, -16, 0],
          y: [0, -22, 14, 0],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      />

      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(8,8,10,0.055) 0.5px, transparent 0.5px)',
        backgroundSize: '26px 26px',
        backgroundPosition: '-1px -1px',
        maskImage: 'radial-gradient(circle at 50% 40%, black 0%, black 50%, transparent 92%)',
      }} />

      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.025, mixBlendMode: 'multiply',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.88' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'fixed', left: 0, right: 0, top: '34%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.5,
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
            <stop offset="50%" stopColor="rgba(0,194,110,0.65)" />
            <stop offset="100%" stopColor="rgba(0,194,110,0)" />
          </linearGradient>
        </defs>
      </motion.svg>

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'fixed', left: 0, right: 0, top: '72%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.35,
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
            <stop offset="50%" stopColor="rgba(120,148,255,0.55)" />
            <stop offset="100%" stopColor="rgba(120,148,255,0)" />
          </linearGradient>
        </defs>
      </motion.svg>
    </>
  )
}
