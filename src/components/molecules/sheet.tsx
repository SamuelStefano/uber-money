import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, onClose, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,10,15,0.5)', zIndex: 500,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: '#fff',
              borderTopLeftRadius: 32, borderTopRightRadius: 32,
              paddingBottom: 36, maxHeight: '88%', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
              <div style={{ width: 38, height: 5, borderRadius: 100, background: '#E5E5E7' }} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
