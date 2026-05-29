import type { CSSProperties, ReactNode } from 'react'
import { Screen } from '@/components/atoms/screen'
import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { PageHeading } from '@/components/atoms/page-heading'
import { Money } from '@/components/atoms/money'
import { Pill } from '@/components/atoms/pill'
import { Spinner } from '@/components/atoms/spinner'
import { SecurityNote } from '@/components/molecules/security-note'
import { REASONS } from '@/consts/credit'
import { useRequestScreen, type RequestStep } from './use-request-screen'
import { AmountPicker } from './_components/amount-picker'
import { ReasonPicker } from './_components/reason-picker'
import { ProfilePicker } from './_components/profile-picker'
import type { LoanRequestPayload } from '@/types/api'

interface RequestScreenProps {
  onSubmit: (payload: LoanRequestPayload) => void
  onBack: () => void
}

const STEP_ORDER: RequestStep[] = ['valor', 'perfil', 'confirmar']

const STEP_TITLES: Record<RequestStep, { title: string; subtitle: string }> = {
  valor: { title: 'Quanto você precisa hoje?', subtitle: 'Aprovação na hora. Dinheiro via Pix.' },
  perfil: { title: 'Conta um pouco de você', subtitle: 'Sem consulta a bureau. Você declara — a gente ajusta.' },
  confirmar: { title: 'Tudo certo?', subtitle: 'Confira a oferta antes de pedir.' },
}

function Stepper({ current }: { current: RequestStep }) {
  const idx = STEP_ORDER.indexOf(current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {STEP_ORDER.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 999,
              background: active ? 'var(--ink)' : done ? 'var(--accent)' : '#fff',
              color: active ? '#fff' : done ? '#04140B' : 'var(--mute)',
              boxShadow: active ? 'none' : 'inset 0 0 0 1.2px var(--line)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {done ? <Icon.Check style={{ width: 14, height: 14 }} /> : i + 1}
            </div>
            {i < STEP_ORDER.length - 1 ? (
              <div style={{ width: 28, height: 2, background: done ? 'var(--accent)' : 'var(--line)' }} />
            ) : null}
          </div>
        )
      })}
      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--mute)', fontWeight: 600 }}>
        {idx + 1}/{STEP_ORDER.length}
      </span>
    </div>
  )
}

function BreakdownRow({ label, tone }: { label: string; tone: 'boa' | 'media' | 'ruim' }) {
  const map: Record<typeof tone, { color: string; bg: string; text: string }> = {
    boa: { color: 'var(--accent-deep)', bg: 'var(--accent-soft)', text: 'Boa' },
    media: { color: '#4F6AE0', bg: 'rgba(120,148,255,0.10)', text: 'Média' },
    ruim: { color: '#B23A3A', bg: 'rgba(220,60,60,0.06)', text: 'Ruim' },
  }
  const s = map[tone]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
        background: s.bg, color: s.color,
      }}>{s.text}</span>
    </div>
  )
}

function SummaryBox({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      padding: 24, borderRadius: 24, background: '#fff',
      boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--line-2)',
      display: 'flex', flexDirection: 'column', gap: 14,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function RequestScreen({ onSubmit, onBack }: RequestScreenProps) {
  const r = useRequestScreen({ onSubmit })
  const meta = STEP_TITLES[r.step]
  const reasonOption = r.reason ? REASONS.find((x) => x.id === r.reason) ?? null : null

  const handleBack = () => {
    if (r.step === 'valor') { onBack(); return }
    r.goBack()
  }

  return (
    <Screen label="03 Request" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 920, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'var(--mute)', fontSize: 14, fontWeight: 600, padding: '6px 0',
            }}
          >
            <Icon.ArrowLeft style={{ width: 16, height: 16 }} /> Voltar
          </button>
          <Stepper current={r.step} />
        </div>

        <div style={{ marginTop: 20 }}>
          <PageHeading subtitle={meta.subtitle}>
            {meta.title}
          </PageHeading>
        </div>

        {r.step === 'valor' && (
          <>
            <AmountPicker value={r.amount} onChange={r.setAmount} />
            <ReasonPicker value={r.reason} onChange={r.setReason} />
            {r.reason === 'outro' && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="text"
                  value={r.otherText}
                  onChange={(e) => r.setOtherText(e.target.value.slice(0, 80))}
                  placeholder="Conta pra gente — ex: conta de luz, mercado…"
                  maxLength={80}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 16,
                    border: '1px solid var(--line)', background: '#fff',
                    fontSize: 15, fontWeight: 500, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--mute)', textAlign: 'right' }}>
                  {r.otherText.length}/80
                </div>
              </div>
            )}
          </>
        )}

        {r.step === 'perfil' && (
          <ProfilePicker value={r.profile} onChange={r.updateProfile} />
        )}

        {r.step === 'confirmar' && (
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SummaryBox>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Você pediu</div>
                  <Money value={r.amount} size={36} symbolSize={18} centsSize={16} weight={800} />
                </div>
                {reasonOption ? <Pill tone="paper">{reasonOption.label}</Pill> : null}
              </div>
              {r.reason === 'outro' && r.otherText ? (
                <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>
                  Finalidade: {r.otherText}
                </div>
              ) : null}
            </SummaryBox>

            {r.scoring && (
              <SummaryBox style={{ alignItems: 'center', gap: 12 }}>
                <Spinner size={28} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Calculando seu score…</div>
              </SummaryBox>
            )}

            {r.scoreError && !r.scoring && (
              <SummaryBox style={{ background: 'rgba(220,60,60,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#B23A3A' }}>
                  {r.scoreError}
                </div>
              </SummaryBox>
            )}

            {r.scoreResult && !r.scoring && (
              <>
                <SummaryBox>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Oferta</div>
                    <Pill tone={r.scoreResult.approved ? 'accent' : 'danger'} dot pulse={r.scoreResult.approved}>
                      {r.scoreResult.approved ? `Aprovado · score ${r.scoreResult.score}` : 'Recusado'}
                    </Pill>
                  </div>
                  {r.scoreResult.approved ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Liberado</div>
                        <Money value={r.scoreResult.approved_amount_brl} size={28} symbolSize={14} centsSize={14} weight={800} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Juros</div>
                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{r.scoreResult.interest_pct.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parcelas</div>
                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{r.scoreResult.installments}x</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Limite</div>
                        <Money value={r.scoreResult.limit_brl} size={28} symbolSize={14} centsSize={14} weight={800} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: 'var(--mute)', fontWeight: 500 }}>
                      {r.scoreResult.rejection_reason ?? 'Não foi possível aprovar agora.'}
                    </div>
                  )}
                </SummaryBox>

                <SummaryBox>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Como avaliamos</div>
                  <div>
                    <BreakdownRow label="Tempo de Uber" tone={r.scoreResult.breakdown.tempo_uber} />
                    <BreakdownRow label="Dias por semana" tone={r.scoreResult.breakdown.dias_semana} />
                    <BreakdownRow label="Corridas por semana" tone={r.scoreResult.breakdown.corridas_semana} />
                    <BreakdownRow label="Fonte de renda" tone={r.scoreResult.breakdown.fonte_renda} />
                    <BreakdownRow label="Nota do motorista" tone={r.scoreResult.breakdown.nota_motorista} />
                    <BreakdownRow label="Veículo" tone={r.scoreResult.breakdown.status_veiculo} />
                    <BreakdownRow label="Negativação" tone={r.scoreResult.breakdown.negativacao} />
                  </div>
                </SummaryBox>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {r.step === 'confirmar' ? (
            <Button
              variant="accent"
              size="lg"
              disabled={!r.stepValid || r.scoring}
              loading={r.scoring}
              onClick={r.submit}
              icon={<Icon.ArrowRight />}
              style={{ minWidth: 280 }}
            >
              Pedir empréstimo
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              disabled={!r.stepValid}
              onClick={r.goNext}
              icon={<Icon.ArrowRight />}
              style={{ minWidth: 280 }}
            >
              Continuar
            </Button>
          )}
          <SecurityNote>Análise instantânea · sem consulta ao SPC</SecurityNote>
        </div>
      </div>
    </Screen>
  )
}
