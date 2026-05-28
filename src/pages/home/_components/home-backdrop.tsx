import { motion } from 'framer-motion'

// BG home — paleta cripto fria: verde Solana + roxo Solana + azul. Aurora drift visível.
export function HomeBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'linear-gradient(180deg, #EEF1F2 0%, #E5EAEE 100%)',
      }} />

      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -160, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(760px 580px at 14% 16%, rgba(20,241,149,0.30) 0%, transparent 60%),
            radial-gradient(680px 520px at 88% 24%, rgba(153,69,255,0.24) 0%, transparent 60%),
            radial-gradient(820px 620px at 70% 96%, rgba(46,124,255,0.22) 0%, transparent 60%)
          `,
        }}
        animate={{ x: [0, 36, -22, 0], y: [0, -26, 16, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(8,8,10,0.05) 0.5px, transparent 0.5px)',
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
          stroke="url(#um-beam-green)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
        <defs>
          <linearGradient id="um-beam-green" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(20,241,149,0)" />
            <stop offset="50%" stopColor="rgba(20,241,149,0.85)" />
            <stop offset="100%" stopColor="rgba(20,241,149,0)" />
          </linearGradient>
        </defs>
      </motion.svg>

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'absolute', left: 0, right: 0, top: '60%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.45,
        }}
      >
        <motion.line
          x1="100%" y1="1" x2="0" y2="1"
          stroke="url(#um-beam-purple)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 4, delay: 2.2 }}
        />
        <defs>
          <linearGradient id="um-beam-purple" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(153,69,255,0)" />
            <stop offset="50%" stopColor="rgba(153,69,255,0.65)" />
            <stop offset="100%" stopColor="rgba(153,69,255,0)" />
          </linearGradient>
        </defs>
      </motion.svg>

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'absolute', left: 0, right: 0, top: '82%',
          pointerEvents: 'none', zIndex: 0, opacity: 0.35,
        }}
      >
        <motion.line
          x1="0" y1="1" x2="100%" y2="1"
          stroke="url(#um-beam-blue)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'linear', repeatDelay: 4, delay: 4.4 }}
        />
        <defs>
          <linearGradient id="um-beam-blue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(46,124,255,0)" />
            <stop offset="50%" stopColor="rgba(46,124,255,0.65)" />
            <stop offset="100%" stopColor="rgba(46,124,255,0)" />
          </linearGradient>
        </defs>
      </motion.svg>
    </>
  )
}
