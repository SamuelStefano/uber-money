import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/atoms/icon'
import { BRL } from '@/utils/format'

interface PixNotificationProps {
  show: boolean
  amountBRL: number
}

export function PixNotification({ show, amountBRL }: PixNotificationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 420, zIndex: 400,
            background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(20px)',
            borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            color: '#fff', boxShadow: '0 24px 48px -10px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'var(--accent)', color: '#04140B',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon.Pix />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Uber Money</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>agora</div>
            </div>
            <div style={{ fontSize: 14, marginTop: 2 }}>
              Pix recebido · <span className="tight" style={{ fontWeight: 700 }}>{BRL(amountBRL)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
