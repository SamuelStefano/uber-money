import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppFrame } from '@/components/organisms/app-frame'
import { ToastProvider } from '@/components/organisms/toast-provider'
import { LoginScreen } from '@/pages/login'
import { UploadScreen } from '@/pages/upload'
import { HomeScreen } from '@/pages/home'
import { RequestScreen } from '@/pages/request'
import { AnalysisScreen } from '@/pages/analysis'
import { ApprovedScreen } from '@/pages/approved'
import { Store } from '@/store'
import { useStore } from '@/hooks/use-store'
import { RouteProvider, type Route } from '@/contexts/route-context'
import type { LoanRequestPayload } from '@/types/api'

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0.0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -16 : 16, opacity: 0 }),
}

export function App() {
  const [route, setRoute] = useState<Route>('login')
  const [pendingPayload, setPendingPayload] = useState<LoanRequestPayload | null>(null)
  const [hasNavigated, setHasNavigated] = useState(false)
  const [dir, setDir] = useState(1)
  const [{ lastDecision }] = useStore()

  const go = useCallback((next: Route, direction = 1) => {
    setDir(direction)
    setRoute(next)
    setHasNavigated(true)
  }, [])

  const goHome = useCallback(() => {
    setPendingPayload(null)
    go('home', -1)
  }, [go])

  return (
    <ToastProvider>
      <RouteProvider value={{ route, goHome }}>
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
            {route === 'login' && <LoginScreen onLogin={(next) => go(next, 1)} />}
            {route === 'upload' && (
              <UploadScreen onDone={(docs) => { Store.set({ documents: docs }); go('home', 1) }} />
            )}
            {route === 'home' && <HomeScreen onRequestCredit={() => go('request', 1)} />}
            {route === 'request' && (
              <RequestScreen
                onBack={() => go('home', -1)}
                onSubmit={(p) => { setPendingPayload(p); go('analysis', 1) }}
              />
            )}
            {route === 'analysis' && pendingPayload && (
              <AnalysisScreen
                payload={pendingPayload}
                onDone={(decision, err) => {
                  if (err || !decision || !decision.approved) go('request', -1)
                  else go('approved', 1)
                }}
              />
            )}
            {route === 'approved' && lastDecision && (
              <ApprovedScreen decision={lastDecision} onHome={() => go('home', -1)} />
            )}
          </motion.div>
        </AnimatePresence>
      </AppFrame>
      </RouteProvider>
    </ToastProvider>
  )
}
