// @ts-nocheck
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppFrame, ToastProvider } from './components'
import { LoginScreen, HomeScreen, RequestScreen, AnalysisScreen, ApprovedScreen } from './screens'
import { Store } from './services'

export function App() {
  const [route, setRoute] = useState<'login' | 'home' | 'request' | 'analysis' | 'approved'>('login')
  const [pendingPayload, setPendingPayload] = useState<any>(null)
  const [balanceAnimKey, setBalanceAnimKey] = useState(0)
  const [hasNavigated, setHasNavigated] = useState(false)
  const [dir, setDir] = useState(1)

  const go = (next: any, direction = 1) => {
    setDir(direction)
    setRoute(next)
    setHasNavigated(true)
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0.0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -16 : 16, opacity: 0 }),
  }

  return (
    <ToastProvider>
      <AppFrame>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={route}
            custom={dir}
            variants={variants}
            initial={hasNavigated ? 'enter' : false}
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {route === 'login' && <LoginScreen onLogin={() => go('home', 1)} />}
            {route === 'home' && (
              <HomeScreen balanceAnimKey={balanceAnimKey} onRequestCredit={() => go('request', 1)} />
            )}
            {route === 'request' && (
              <RequestScreen
                onBack={() => go('home', -1)}
                onSubmit={(p: any) => { setPendingPayload(p); go('analysis', 1) }}
              />
            )}
            {route === 'analysis' && (
              <AnalysisScreen
                payload={pendingPayload}
                onDone={(decision: any, err: any) => {
                  if (err || !decision) go('request', -1)
                  else go('approved', 1)
                }}
              />
            )}
            {route === 'approved' && (
              <ApprovedScreen
                decision={Store.get().lastDecision}
                onHome={() => { setBalanceAnimKey((k) => k + 1); go('home', -1) }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AppFrame>
    </ToastProvider>
  )
}
