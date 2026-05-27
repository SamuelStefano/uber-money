import { MOCK_PIX_KEY } from '@/consts/mock'
import type { StoreState, StoreUpdater } from '@/types/store'

const initialState: StoreState = {
  user: null,
  wallet: { balanceBRL: 0, pixKey: MOCK_PIX_KEY },
  activity: [],
  lastDecision: null,
  lastReceipt: null,
  pendingRequest: null,
  documents: null,
  muted: false,
}

type Listener = (s: StoreState) => void

function createStore() {
  let state: StoreState = { ...initialState }
  const subscribers = new Set<Listener>()
  return {
    get: (): StoreState => state,
    set: (patch: StoreUpdater): void => {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
      subscribers.forEach((fn) => fn(state))
    },
    subscribe: (fn: Listener): (() => void) => {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },
  }
}

export const Store = createStore()
