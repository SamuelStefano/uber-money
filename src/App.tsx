import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { AppFrame } from '@/components/organisms/app-frame'
import { ToastProvider, useToast } from '@/components/organisms/toast-provider'
import { LoginScreen } from '@/pages/login'
import { UploadScreen } from '@/pages/upload'
import { HomeScreen } from '@/pages/home'
import { RequestScreen } from '@/pages/request'
import { AnalysisScreen } from '@/pages/analysis'
import { ApprovedScreen } from '@/pages/approved'
import { RepayScreen } from '@/pages/repay'
import { DevResetScreen } from '@/pages/dev-reset'
import { Store } from '@/store'
import { useStore } from '@/hooks/use-store'
import { RouteProvider, type Route } from '@/contexts/route-context'
import { setWalletAccessToken } from '@/lib/api'
import type { LoanRequestPayload } from '@/types/api'

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0.0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -16 : 16, opacity: 0 }),
}

function AuthGuard({ route, onForceLogin }: { route: Route; onForceLogin: () => void }) {
  const wallet = useWallet()
  const [{ user }] = useStore()
  const toast = useToast()

  // Telas protegidas: tudo menos login. Se a wallet desconectar (F5 sem
  // auto-reconnect, troca de conta no Phantom, user clicou Desconectar),
  // expulsa pra login com toast amigável.
  useEffect(() => {
    if (route === 'login') return
    if (wallet.connecting) return
    if (!wallet.connected || !wallet.publicKey) {
      Store.set({ user: null, documents: null, lastDecision: null, lastReceipt: null, activity: [] })
      setWalletAccessToken(null)
      toast.push('Sua carteira desconectou — entre de novo')
      onForceLogin()
    }
  }, [route, wallet.connected, wallet.connecting, wallet.publicKey, user, onForceLogin, toast])

  return null
}

function AppInner() {
  const isDevReset = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev-reset')
  if (isDevReset) {
    return (
      <RouteProvider value={{ route: 'login', goHome: () => { window.location.href = '/' } }}>
        <AppFrame>
          <DevResetScreen />
        </AppFrame>
      </RouteProvider>
    )
  }

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

  const forceLogin = useCallback(() => {
    setPendingPayload(null)
    go('login', -1)
  }, [go])

  return (
    <RouteProvider value={{ route, goHome }}>
      <AuthGuard route={route} onForceLogin={forceLogin} />
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
            {route === 'home' && <HomeScreen onRequestCredit={() => go('request', 1)} onRepay={() => go('repay', 1)} />}
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
              <ApprovedScreen decision={lastDecision} onHome={() => go('home', -1)} onRepay={() => go('repay', 1)} />
            )}
            {route === 'repay' && lastDecision && (
              <RepayScreen decision={lastDecision} onHome={() => go('home', -1)} />
            )}
          </motion.div>
        </AnimatePresence>
      </AppFrame>
    </RouteProvider>
  )
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
