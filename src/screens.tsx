// @ts-nocheck
// screens.tsx — 5 screens (Login, Home, Request, Analysis, Approved).
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Screen, Button, Spinner, Card, Chip, Field, Money, Sheet, Icon, useToast } from './components'
import {
  useStore, useCountUp, Store, BRL, dateBR, timeBR, uid,
  requestCredit, sendPix,
} from './services'

// ═══ 1. LOGIN (wallet-only) ══════════════════════════════════════
export function LoginScreen({ onLogin }: any) {
  const { setVisible } = useWalletModal()
  const wallet = useWallet()
  const toast = useToast()
  const [waiting, setWaiting] = useState(false)

  // when wallet connects, set user and navigate
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const address = wallet.publicKey.toBase58()
      Store.set({
        user: {
          id: uid('USR_'),
          name: 'Motorista',
          uberConnected: false,
          walletAddress: address,
          walletProvider: wallet.wallet?.adapter?.name || 'Phantom',
        },
      })
      setWaiting(false)
      onLogin()
    }
  }, [wallet.connected, wallet.publicKey])

  const connect = () => {
    setWaiting(true)
    try { setVisible(true) } catch (e) { toast.push('Não foi possível abrir a carteira'); setWaiting(false) }
  }

  return (
    <Screen label="01 Login">
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)', overflow: 'hidden', position: 'relative' }}>
        {/* LEFT — claim */}
        <section style={{ padding: 'clamp(40px, 5vw, 64px) clamp(40px, 6vw, 80px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -160, left: -120, width: 520, height: 520, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.45, background: 'radial-gradient(circle, rgba(0,194,110,0.55) 0%, rgba(0,194,110,0) 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -200, right: -100, width: 460, height: 460, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.30, background: 'radial-gradient(circle, rgba(255,180,80,0.5) 0%, rgba(255,180,80,0) 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 580 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 8px', borderRadius: 999, background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)', fontSize: 12, fontWeight: 600, color: 'var(--mute)', letterSpacing: '0.02em' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
              SOLANA · CHAINLINK SCORE
            </div>
            <h1 className="tight" style={{ fontSize: 'clamp(40px, 6.5vw, 80px)', fontWeight: 800, margin: '20px 0 0', letterSpacing: '-0.045em', lineHeight: 0.98 }}>
              Crédito na hora,<br/>
              <span style={{ background: 'linear-gradient(90deg, var(--accent-deep) 0%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>pra quem roda.</span>
            </h1>
            <p style={{ marginTop: 'clamp(16px, 2vw, 28px)', fontSize: 'clamp(15px, 1.4vw, 19px)', color: 'var(--mute)', lineHeight: 1.5, maxWidth: 460, letterSpacing: '-0.005em' }}>
              Furou o pneu? Acabou a gasolina? O dinheiro cai no seu Pix em segundos. Score on‑chain, juros baixos, sem consulta ao SPC.
            </p>

            <div style={{ marginTop: 'clamp(20px, 3vw, 40px)', display: 'flex', gap: 'clamp(20px, 2.5vw, 28px)', flexWrap: 'wrap' }}>
              <Stat label="Aprovação média" value="6,4s" />
              <Stat label="Sem consulta" value="SPC" />
              <Stat label="Juros a partir de" value="2,9%" />
            </div>
          </div>
        </section>

        {/* RIGHT — wallet connect */}
        <section style={{ background: '#fff', borderLeft: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px, 5vw, 64px)', position: 'relative', overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <h2 className="tight" style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.025em' }}>Entrar</h2>
            <p style={{ marginTop: 8, color: 'var(--mute)', fontSize: 15 }}>
              Conecte sua carteira Solana pra continuar.
            </p>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={connect}
                disabled={waiting || wallet.connecting}
                style={{
                  height: 64, borderRadius: 18, padding: '0 22px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  background: 'var(--ink)', color: '#fff',
                  fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
                  cursor: waiting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 12px 28px -8px rgba(10,10,15,0.35)',
                  transition: 'transform 120ms ease',
                }}
              >
                {waiting || wallet.connecting ? (
                  <Spinner size={18} color="#fff" />
                ) : (
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />
                )}
                Conectar carteira Solana
              </button>

              <div style={{ fontSize: 12, color: 'var(--mute-2)', textAlign: 'center', marginTop: 4 }}>
                Phantom · Solflare · qualquer wallet adapter
              </div>

              <div style={{
                marginTop: 18, padding: 16, borderRadius: 14,
                background: 'var(--canvas)', display: 'flex', gap: 12,
              }}>
                <Icon.Shield />
                <div style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5 }}>
                  Sua carteira, suas chaves. Não pedimos e‑mail, não criamos conta.
                  Só uma assinatura on‑chain.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Screen>
  )
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="tight tabular" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--mute)', fontWeight: 500, marginTop: 2, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

// ═══ 2. HOME ═════════════════════════════════════════════════════
export function HomeScreen({ onRequestCredit }: any) {
  const [s] = useStore()
  const balance = useCountUp(s.wallet.balanceBRL, { duration: 1300, initialValue: 0 })
  return (
    <Screen label="02 Home" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--mute)', fontWeight: 500 }}>{greeting()},</div>
            <h1 className="tight" style={{ fontSize: 40, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.03em' }}>{(s.user?.name || 'Samuel').split(' ')[0]}.</h1>
          </div>

          <Card dark padded={false} style={{ padding: '36px 36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', background: 'radial-gradient(600px 280px at 100% 0%, rgba(0,194,110,0.35) 0%, transparent 60%)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Saldo disponível</div>
                <div style={{ marginTop: 8 }}>
                  <Money value={balance} size={72} color="#fff" weight={800} symbolSize={36} centsSize={28} />
                </div>
                <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  <span style={{ fontWeight: 500 }}>Chave Pix · {s.wallet.pixKey}</span>
                  <button style={{ color: 'rgba(255,255,255,0.7)', display: 'inline-flex', alignItems: 'center', width: 26, height: 26, borderRadius: 8, justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                    <Icon.Copy />
                  </button>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 8px', borderRadius: 999, background: 'rgba(0,194,110,0.18)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(0,194,110,0.28)' }}>
                <span style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#04140B' }}>
                  <Icon.Check style={{ width: 12, height: 12 }} />
                </span>
                Carteira conectada
              </div>
            </div>
          </Card>

          <div>
            <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Atividade</div>
            {s.activity.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute-2)', fontSize: 14, fontWeight: 500, border: '1.5px dashed var(--line)', borderRadius: 24, background: '#fff' }}>
                Nada por aqui ainda. Quando você pedir crédito, vai aparecer aqui.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.activity.map((a: any) => <ActivityRow key={a.id} item={a} />)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <button onClick={onRequestCredit} style={{
            width: '100%', borderRadius: 28, padding: '32px 28px 28px',
            background: 'var(--accent)', color: '#04140B', textAlign: 'left',
            boxShadow: 'var(--shadow-glow)',
            display: 'flex', flexDirection: 'column', gap: 24,
            transition: 'transform 180ms ease',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.65, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pra você</div>
            <div className="tight" style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Solicitar<br/>crédito
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
              <span>Aprovação em segundos</span>
              <span style={{ width: 40, height: 40, borderRadius: 999, background: '#04140B', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.ArrowRight />
              </span>
            </div>
          </button>

          <Card padded style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Seu score</div>
              <div style={{ fontSize: 11, color: 'var(--mute-2)', fontWeight: 500 }}>on‑chain</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span className="tight tabular" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>78</span>
              <span style={{ fontSize: 18, color: 'var(--mute)', fontWeight: 600 }}>/100</span>
            </div>
            <ScoreBar value={78} />
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>Pago em dia · ganhos consistentes · 3 anos rodando</div>
          </Card>

          <Card padded style={{ padding: 22 }}>
            <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Limite disponível</div>
            <div style={{ marginTop: 4 }}>
              <Money value={500} size={32} symbolSize={16} centsSize={14} weight={800} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>
              Até R$500 por adiantamento · juros a partir de 2,9%/mês
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function ScoreBar({ value }: any) {
  return (
    <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: '#EEE', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, background: 'linear-gradient(90deg, var(--ink) 0%, var(--accent) 100%)', borderRadius: 999 }} />
    </div>
  )
}

function ActivityRow({ item }: any) {
  const isPix = item.kind === 'pix'
  const sign = isPix ? '+' : '−'
  const tint = isPix ? 'var(--accent-deep)' : 'var(--ink)'
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'inset 0 0 0 1px var(--line-2)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: isPix ? 'var(--accent-soft)' : '#F4F4F5', color: isPix ? 'var(--accent-deep)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPix ? <Icon.Pix /> : <Icon.Spark />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 1 }}>{item.sub}</div>
      </div>
      <div className="tabular tight" style={{ fontSize: 18, fontWeight: 700, color: tint }}>{sign}{BRL(item.amountBRL)}</div>
    </div>
  )
}

// ═══ 3. REQUEST ══════════════════════════════════════════════════
const REASONS = [
  { id: 'pneu', label: 'Pneu', icon: <Icon.Tire /> },
  { id: 'combustivel', label: 'Combustível', icon: <Icon.Fuel /> },
  { id: 'manutencao', label: 'Manutenção', icon: <Icon.Wrench /> },
  { id: 'outro', label: 'Outro', icon: <Icon.Dots /> },
]
const AMOUNTS = [100, 200, 300, 500]

export function RequestScreen({ onSubmit, onBack }: any) {
  const [amount, setAmount] = useState(200)
  const [reason, setReason] = useState('pneu')
  const [weeklyEarnings, setWeeklyEarnings] = useState('1800')
  const [rides, setRides] = useState('120')
  const [years, setYears] = useState('3')
  const [city, setCity] = useState('São Paulo')

  const valid = amount >= 100 && amount <= 500 && !!reason && Number(weeklyEarnings) > 0 && Number(rides) > 0 && Number(years) >= 0 && city.trim().length > 1

  const submit = () => {
    if (!valid) return
    onSubmit({ amountBRL: amount, reason, weeklyEarningsBRL: Number(weeklyEarnings), ridesPerWeek: Number(rides), yearsDriving: Number(years), city: city.trim() })
  }

  return (
    <Screen label="03 Request" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--mute)', fontSize: 14, fontWeight: 600, padding: '6px 0' }}>
          <Icon.ArrowLeft style={{ width: 16, height: 16 }} /> Voltar
        </button>

        <h1 className="tight" style={{ fontSize: 56, fontWeight: 800, margin: '20px 0 0', letterSpacing: '-0.035em', lineHeight: 1.02 }}>Quanto você precisa hoje?</h1>
        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--mute)' }}>Empréstimo on‑chain. Aprovação na hora, dinheiro via Pix.</p>

        <div style={{ marginTop: 36, padding: '40px 32px', borderRadius: 28, background: '#fff', boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <motion.div key={amount} initial={{ scale: 0.92, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 16, stiffness: 320 }}>
            <Money value={amount} size={112} symbolSize={48} centsSize={40} weight={800} />
          </motion.div>

          <div style={{ width: '100%', maxWidth: 520 }}>
            <AmountSlider value={amount} onChange={setAmount} min={100} max={500} step={10} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--mute-2)', fontWeight: 500 }}>
              <span>R$ 100</span><span>R$ 500</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {AMOUNTS.map((v) => (
              <Chip key={v} label={`R$${v}`} active={amount === v} onClick={() => setAmount(v)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pra quê?</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {REASONS.map((r) => (
              <Chip key={r.id} size="lg" icon={r.icon} label={r.label} active={reason === r.id} onClick={() => setReason(r.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Pra calcular seu score on‑chain</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Field label="Ganhos por semana" prefix="R$" value={weeklyEarnings} onChange={setWeeklyEarnings} inputMode="numeric" />
            <Field label="Corridas por semana" value={rides} onChange={setRides} inputMode="numeric" />
            <Field label="Anos rodando" value={years} onChange={setYears} inputMode="numeric" />
            <Field label="Cidade" value={city} onChange={setCity} />
          </div>
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button variant="accent" size="lg" disabled={!valid} onClick={submit} icon={<Icon.ArrowRight />} style={{ minWidth: 280 }}>
            Pedir agora
          </Button>
          <div style={{ fontSize: 12, color: 'var(--mute-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Shield /><span>Análise instantânea · sem consulta ao SPC · Solana</span>
          </div>
        </div>
      </div>
    </Screen>
  )
}

function AmountSlider({ value, onChange, min, max, step }: any) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 999, background: '#E9E9EB' }} />
      <div style={{ position: 'absolute', left: 0, height: 10, borderRadius: 999, background: 'linear-gradient(90deg, var(--ink) 0%, var(--accent) 100%)', width: `${pct}%` }} />
      <div style={{ position: 'absolute', left: `calc(${pct}% - 16px)`, width: 32, height: 32, borderRadius: 999, background: '#fff', boxShadow: '0 4px 12px -2px rgba(10,10,15,0.25), inset 0 0 0 1px var(--line)', pointerEvents: 'none' }} />
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e: any) => onChange(Number(e.target.value))} style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: 40, opacity: 0, cursor: 'grab' }} />
    </div>
  )
}

// ═══ 4. ANALYSIS ═════════════════════════════════════════════════
const ANALYSIS_STEPS = [
  'Lendo seus ganhos na Uber…',
  'Calculando seu score on‑chain…',
  'Validando empréstimo na Solana…',
]

export function AnalysisScreen({ payload, onDone }: any) {
  const [step, setStep] = useState(0)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(ANALYSIS_STEPS.length - 1, s + 1))
    }, 800)

    requestCredit(payload)
      .then((decision: any) => {
        if (!mounted) return
        Store.set({ lastDecision: decision })
        setTimeout(() => mounted && onDone(decision), 700)
      })
      .catch(() => {
        if (!mounted) return
        toast.push('Conexão instável. Tentando de novo…')
        setTimeout(() => mounted && onDone(null, true), 1000)
      })

    return () => { mounted = false; clearInterval(stepTimer) }
  }, [])

  return (
    <Screen label="04 Analysis">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 56 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', opacity: 0.16, animation: `pulse-ring 1.8s ease-out ${i * 0.6}s infinite` }} />
          ))}
          <div style={{ position: 'absolute', inset: 36, borderRadius: '50%', background: 'var(--ink)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <Spinner size={52} color="var(--accent)" strokeWidth={2.2} />
          </div>
        </div>

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
            >{ANALYSIS_STEPS[step]}</motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {ANALYSIS_STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 28 : 10, height: 10, borderRadius: 999, background: i <= step ? 'var(--ink)' : '#E5E5E7', transition: 'all 320ms ease' }} />
          ))}
        </div>

        <div style={{ marginTop: 64, fontSize: 13, color: 'var(--mute-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Shield /><span>Solana · Chainlink CRE · Woovi</span>
        </div>
      </div>
    </Screen>
  )
}

// ═══ 5. APPROVED + PIX ═══════════════════════════════════════════
export function ApprovedScreen({ decision, onHome }: any) {
  const [phase, setPhase] = useState<'approved' | 'claiming' | 'done'>('approved')
  const [receipt, setReceipt] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [confetti, setConfetti] = useState<any[]>([])
  const toast = useToast()

  if (!decision) return null

  const claim = async () => {
    setPhase('claiming')
    try {
      const r = await sendPix({ amountBRL: decision.approvedAmountBRL, to: Store.get().wallet.pixKey })
      Store.set((s: any) => ({
        ...s,
        wallet: { ...s.wallet, balanceBRL: s.wallet.balanceBRL + decision.approvedAmountBRL },
        activity: [
          { id: r.id, kind: 'pix', amountBRL: decision.approvedAmountBRL, label: 'Pix recebido', sub: `Empréstimo ${decision.loanId} · agora`, timestamp: r.timestamp },
          { id: decision.loanId, kind: 'loan', amountBRL: decision.approvedAmountBRL, label: 'Empréstimo aberto', sub: `${decision.installments}× · ${decision.interestPct.toFixed(1)}%/mês · vence ${dateBR(decision.dueDate)}`, timestamp: r.timestamp },
          ...s.activity,
        ],
        lastReceipt: r,
      }))
      setReceipt(r)
      setShowNotif(true)
      const dots = Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        left: 50 + (Math.random() - 0.5) * 30,
        dx: (Math.random() - 0.5) * 720,
        dy: -(220 + Math.random() * 360),
        rot: (Math.random() - 0.5) * 720,
        color: ['#00C26E', '#0A0A0B', '#FFB400', '#00C26E', '#E5FAF0'][i % 5],
        delay: Math.random() * 120,
      }))
      setConfetti(dots)
      setTimeout(() => setShowNotif(false), 4000)
      setPhase('done')
    } catch (e) {
      toast.push('Pix demorou demais. Tente de novo.')
      setPhase('approved')
    }
  }

  return (
    <Screen label="05 Approved" style={{ background: '#FAFAF8' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        {confetti.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {confetti.map((d) => (
              <span key={d.id} className="confetti-dot" style={{
                left: `${d.left}%`, top: '42%', background: d.color,
                animation: `confetti-fly 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d.delay}ms forwards`,
                width: 10, height: 10,
                '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--rot': `${d.rot}deg`,
              } as any} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', position: 'relative', maxWidth: 640 }}>
          <div style={{ position: 'relative', width: 136, height: 136, margin: '0 auto 32px' }}>
            <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,110,0.32) 0%, transparent 70%)' }} />
            <svg width="136" height="136" viewBox="0 0 96 96" style={{ display: 'block' }}>
              <circle cx="48" cy="48" r="44" fill="var(--accent)"/>
              <circle cx="48" cy="48" r="44" fill="none" stroke="var(--accent-deep)" strokeWidth="2" opacity="0.4"/>
              <path d="M30 49 L43 62 L66 36" stroke="#04140B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>

          <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Crédito aprovado</div>

          <Money value={decision.approvedAmountBRL} size={120} symbolSize={52} centsSize={44} weight={800} />

          <div style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 14, fontSize: 14, color: 'var(--mute)', fontWeight: 500, padding: '8px 16px', borderRadius: 999, background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }} />
              Score {Math.round(decision.score / 10)}/100
            </span>
            <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
            <span>{decision.installments}× sem complicação</span>
            <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
            <span>{decision.interestPct.toFixed(1)}%/mês</span>
          </div>

          <div style={{ marginTop: 44, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {phase !== 'done' ? (
              <Button variant="accent" size="lg" loading={phase === 'claiming'} onClick={claim} icon={<Icon.Pix />} style={{ minWidth: 280 }}>
                {phase === 'claiming' ? 'Enviando Pix…' : 'Receber via Pix agora'}
              </Button>
            ) : (
              <>
                <Button variant="primary" size="lg" onClick={() => setShowReceipt(true)} icon={<Icon.CheckCircle />} style={{ minWidth: 220 }}>Ver comprovante</Button>
                <Button variant="secondary" size="lg" onClick={onHome} style={{ minWidth: 220 }}>Voltar pro início</Button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showNotif && (
            <motion.div
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -120, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, zIndex: 400, background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, color: '#fff', boxShadow: '0 24px 48px -10px rgba(0,0,0,0.45)' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent)', color: '#04140B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon.Pix />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Uber Money</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>agora</div>
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>
                  💸 Pix recebido · <span className="tight" style={{ fontWeight: 700 }}>{BRL(decision.approvedAmountBRL)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Sheet open={showReceipt} onClose={() => setShowReceipt(false)}>
          {receipt && <Receipt receipt={receipt} decision={decision} onClose={() => setShowReceipt(false)} />}
        </Sheet>
      </div>
    </Screen>
  )
}

function Receipt({ receipt, decision, onClose }: any) {
  return (
    <div style={{ padding: '24px 40px 32px', maxWidth: 520, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-deep)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.Pix />
        </div>
        <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 600, marginTop: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Comprovante Pix</div>
        <div style={{ marginTop: 8 }}>
          <Money value={receipt.amountBRL} size={52} symbolSize={24} centsSize={20} weight={800} />
        </div>
      </div>

      <div style={{ marginTop: 24, background: 'var(--canvas)', borderRadius: 20, padding: '4px 20px' }}>
        <ReceiptRow label="Data e hora" value={`${dateBR(receipt.timestamp)} · ${timeBR(receipt.timestamp)}`} />
        <ReceiptRow label="Destino" value="Samuel Reis" sub={`Chave · ${receipt.to}`} />
        <ReceiptRow label="Instituição pagadora" value="Uber Money · 24·313·102" sub="Solana devnet · Woovi sandbox" />
        <ReceiptRow label="ID da transação" value={receipt.id} mono />
        <ReceiptRow label="Empréstimo" value={decision.loanId} sub={`${decision.installments}× · ${decision.interestPct.toFixed(1)}%/mês`} mono last />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Button full variant="secondary" size="md" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}

function ReceiptRow({ label, value, sub, mono, last }: any) {
  return (
    <div style={{ padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{label}</div>
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', fontFamily: mono ? 'ui-monospace, SF Mono, Menlo, monospace' : undefined, wordBreak: 'break-all' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--mute-2)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ═══ 2.5 UPLOAD DOCUMENTOS (CNH + extrato Uber) ══════════════════
import { HAS_BACKEND, processDocument, fileToBase64 } from './lib/api'

export function UploadScreen({ onDone }: any) {
  const [cnh, setCnh] = React.useState<any>(null)
  const [earnings, setEarnings] = React.useState<any>(null)
  const [loading, setLoading] = React.useState<'cnh' | 'print_earnings' | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const toast = useToast()

  const handle = async (file: File, kind: 'cnh' | 'print_earnings') => {
    if (!file) return
    setLoading(kind); setErr(null)
    try {
      if (HAS_BACKEND) {
        const b64 = await fileToBase64(file)
        const result = await processDocument(kind, b64, file.type as any)
        if (kind === 'cnh') setCnh(result.ocr_data)
        else setEarnings(result.ocr_data)
        toast.push(kind === 'cnh' ? 'CNH lida' : 'Extrato lido')
      } else {
        // mock OCR (sem backend): simula leitura
        await new Promise((r) => setTimeout(r, 1200))
        if (kind === 'cnh') {
          setCnh({ name: 'Samuel Reis', cpf: '123.456.789-00', category: 'B', valid_until: '2028-12-31', confidence: 'high' })
        } else {
          setEarnings({ gross_monthly_income: 4250, currency: 'BRL', period_days: 30, ride_count: 412, source: 'uber', confidence: 'high' })
        }
        toast.push('OCR mockado (sem backend configurado)')
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e))
      toast.push('Falha ao ler. Tente outra foto.')
    } finally {
      setLoading(null)
    }
  }

  const both = !!cnh && !!earnings

  return (
    <Screen label="02.5 Upload" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <h1 className="tight" style={{ fontSize: 44, fontWeight: 800, margin: '20px 0 0', letterSpacing: '-0.035em', lineHeight: 1.05 }}>
          Pra começar, envie 2 fotos.
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--mute)' }}>
          Sua CNH e a tela de ganhos da semana. Vamos ler os números pra calcular seu score.
        </p>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <UploadZone label="Sua CNH" hint="Frente, boa luz" kind="cnh" onFile={(f) => handle(f, 'cnh')} loading={loading === 'cnh'} result={cnh} renderResult={(d: any) => d?.name ? `${d.name} · cat. ${d.category ?? '?'}` : 'Lido'} />
          <UploadZone label="Tela de ganhos (Uber)" hint="Print do app" kind="earnings" onFile={(f) => handle(f, 'print_earnings')} loading={loading === 'print_earnings'} result={earnings} renderResult={(d: any) => d?.gross_monthly_income ? `R$ ${Number(d.gross_monthly_income).toFixed(0)}/mês · ${d.ride_count ?? '?'} corridas` : 'Lido'} />
        </div>

        {err && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#FEE', color: '#900', fontSize: 13 }}>{err}</div>}

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button variant="accent" size="lg" disabled={!both} onClick={() => onDone({ cnh, earnings })} icon={<Icon.ArrowRight />} style={{ minWidth: 280 }}>
            Continuar
          </Button>
          <div style={{ fontSize: 12, color: 'var(--mute-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Shield /><span>Seus dados ficam off-chain (LGPD). Só o score vai pra blockchain.</span>
          </div>
        </div>
      </div>
    </Screen>
  )
}

function UploadZone({ label, hint, kind, onFile, loading, result, renderResult }: any) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [drag, setDrag] = React.useState(false)
  const done = !!result

  return (
    <label
      onDragOver={(e: any) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e: any) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f) }}
      style={{
        minHeight: 220, borderRadius: 24, padding: 24, cursor: 'pointer',
        background: done ? 'var(--accent-soft)' : drag ? '#F7F7F5' : '#fff',
        boxShadow: done ? 'inset 0 0 0 2px var(--accent)' : drag ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 1.4px var(--line)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transition: 'all 180ms ease',
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e: any) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</div>
          {done && <span style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#04140B' }}><Icon.Check style={{ width: 16, height: 16 }} /></span>}
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--mute)' }}>{hint}</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--mute)' }}>
          <Spinner size={18} /> <span>Lendo com IA…</span>
        </div>
      ) : done ? (
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{renderResult(result)}</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 32, color: 'var(--mute-2)' }}>+</span>
          <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>Arraste ou clique pra enviar</span>
        </div>
      )}
    </label>
  )
}
