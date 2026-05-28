import { createContext, useContext, type ReactNode } from 'react'

type Route = 'login' | 'upload' | 'home' | 'request' | 'analysis' | 'approved'

interface RouteContextValue {
  route: Route
  goHome: () => void
}

const RouteContext = createContext<RouteContextValue | null>(null)

export function RouteProvider({ value, children }: { value: RouteContextValue; children: ReactNode }) {
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

export function useRoute(): RouteContextValue | null {
  return useContext(RouteContext)
}

export type { Route }
