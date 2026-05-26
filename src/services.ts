// @ts-nocheck
// services.ts — mock services, store, helpers.
// Replacement targets: requestCredit → Chainlink CRE + Anchor; sendPix → Woovi.
import { useEffect, useState, useRef } from 'react'

const ALWAYS_APPROVE = true
const SERVICE_DELAY = { min: 700, max: 1500 }

export const sleep = (min = SERVICE_DELAY.min, max = SERVICE_DELAY.max) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)))

export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 9).toUpperCase()

export const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export const BRL_PARTS = (n: number) => {
  const s = BRL(n)
  const m = s.match(/^(R\$\s)(.+),(\d{2})$/)
  if (!m) return { symbol: 'R$', whole: String(Math.floor(n)), cents: '00' }
  return { symbol: m[1].trim(), whole: m[2], cents: m[3] }
}

export const nowISO = () => new Date().toISOString()
export const timeBR = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const dateBR = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function fakeSolanaAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  let s = ''
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function getWallet() {
  await sleep(400, 700)
  return { balanceBRL: 0, pixKey: 'samuel.reis@uber.com' }
}

export async function requestCredit(payload: any) {
  // → Score off-chain (Chainlink CRE) + empréstimo on-chain (Solana Anchor)
  await sleep(1900, 2400)
  const base = Math.min(95, 55 + payload.ridesPerWeek * 0.3 + payload.yearsDriving * 2)
  const score = Math.round(base + (payload.weeklyEarningsBRL > 1500 ? 8 : 0))
  const approved = ALWAYS_APPROVE || score >= 60
  const interestPct = score >= 80 ? 2.9 : score >= 70 ? 3.9 : 4.9
  const installments = payload.amountBRL <= 200 ? 2 : payload.amountBRL <= 350 ? 3 : 4
  const due = new Date()
  due.setDate(due.getDate() + 7)
  return {
    approved,
    score: Math.min(99, score),
    approvedAmountBRL: payload.amountBRL,
    installments,
    interestPct,
    dueDate: due.toISOString(),
    loanId: uid('LN_'),
  }
}

export async function sendPix({ amountBRL, to }: { amountBRL: number; to?: string }) {
  // → Woovi Pix payout
  await sleep(600, 900)
  return {
    id: 'E' + uid('').slice(0, 10) + Date.now().toString(36).toUpperCase().slice(-6),
    amountBRL,
    timestamp: nowISO(),
    to: to || 'samuel.reis@uber.com',
  }
}

// ─── Store (in-memory) ──────────────────────────────────────────
type Activity = { id: string; kind: 'loan' | 'pix'; amountBRL: number; label: string; sub: string; timestamp: string }
type State = {
  user: any
  wallet: { balanceBRL: number; pixKey: string }
  activity: Activity[]
  lastDecision: any
  lastReceipt: any
  pendingRequest: any
  muted: boolean
}

const initialState: State = {
  user: null,
  wallet: { balanceBRL: 0, pixKey: 'samuel.reis@uber.com' },
  activity: [],
  lastDecision: null,
  lastReceipt: null,
  pendingRequest: null,
  muted: false,
}

export const Store = (() => {
  let state: State = { ...initialState }
  const subs = new Set<(s: State) => void>()
  const get = () => state
  const set = (patch: any) => {
    state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
    subs.forEach((fn) => fn(state))
  }
  const subscribe = (fn: (s: State) => void) => {
    subs.add(fn)
    return () => subs.delete(fn)
  }
  return { get, set, subscribe }
})()

export function useStore(): [State, typeof Store.set] {
  const [s, setS] = useState(Store.get())
  useEffect(() => Store.subscribe(setS), [])
  return [s, Store.set]
}

export function useCountUp(target: number, { duration = 1100, initialValue }: { duration?: number; initialValue?: number } = {}) {
  const startVal = initialValue != null ? initialValue : target
  const [value, setValue] = useState(startVal)
  const prevTarget = (useRef<number>(startVal) as any)
  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target
    if (from === target) return
    let rafId: number
    let alive = true
    const t0 = performance.now()
    const tick = (t: number) => {
      if (!alive) return
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    const safety = setTimeout(() => { if (alive) setValue(target) }, duration + 200)
    return () => { alive = false; cancelAnimationFrame(rafId); clearTimeout(safety) }
  }, [target, duration])
  return value
}

// useRef shim (import here to avoid circular)
