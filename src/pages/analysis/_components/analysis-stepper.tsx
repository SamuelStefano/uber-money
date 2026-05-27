import { AnimatePresence, motion } from 'framer-motion'
import { ANALYSIS_STEPS } from '@/consts/analysis'

interface AnalysisStepperProps {
  step: number
}

export function AnalysisStepper({ step }: AnalysisStepperProps) {
  return (
    <>
      <div style={{ height: 64, overflow: 'hidden', position: 'relative', width: '100%', maxWidth: 600, textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="tight"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em' }}
          >
            {ANALYSIS_STEPS[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {ANALYSIS_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 28 : 10, height: 10, borderRadius: 999,
            background: i <= step ? 'var(--ink)' : '#E5E5E7',
            transition: 'all 320ms ease',
          }} />
        ))}
      </div>
    </>
  )
}
