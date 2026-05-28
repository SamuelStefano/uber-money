import { motion } from 'framer-motion'

export function HomeBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(900px 600px at 88% -10%, rgba(0,194,110,0.10) 0%, transparent 55%),
          radial-gradient(700px 500px at -10% 110%, rgba(255,176,71,0.06) 0%, transparent 60%),
          linear-gradient(180deg, #FBFBF9 0%, var(--canvas) 100%)
        `,
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(8,8,10,0.045) 0.5px, transparent 0.5px)',
        backgroundSize: '28px 28px',
        backgroundPosition: '-1px -1px',
        maskImage: 'linear-gradient(180deg, transparent 0%, black 200px, black 70%, transparent 100%)',
      }} />
      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'fixed', left: 0, right: 0, top: '38%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.45,
        }}
      >
        <motion.line
          x1="0" y1="1" x2="100%" y2="1"
          stroke="url(#beam)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        />
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,194,110,0)" />
            <stop offset="50%" stopColor="rgba(0,194,110,0.55)" />
            <stop offset="100%" stopColor="rgba(0,194,110,0)" />
          </linearGradient>
        </defs>
      </motion.svg>
    </>
  )
}
