import { Screen } from '@/components/atoms/screen'
import { Button } from '@/components/atoms/button'
import { Field } from '@/components/atoms/field'
import { Icon } from '@/components/atoms/icon'
import { useRequestScreen } from './use-request-screen'
import { AmountPicker } from './_components/amount-picker'
import { ReasonPicker } from './_components/reason-picker'
import type { LoanRequestPayload } from '@/types/api'

interface RequestScreenProps {
  onSubmit: (payload: LoanRequestPayload) => void
  onBack: () => void
}

export function RequestScreen({ onSubmit, onBack }: RequestScreenProps) {
  const r = useRequestScreen({ onSubmit })

  return (
    <Screen label="03 Request" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'var(--mute)', fontSize: 14, fontWeight: 600, padding: '6px 0',
          }}
        >
          <Icon.ArrowLeft style={{ width: 16, height: 16 }} /> Voltar
        </button>

        <h1 className="tight" style={{ fontSize: 56, fontWeight: 800, margin: '20px 0 0', letterSpacing: '-0.035em', lineHeight: 1.02 }}>
          Quanto você precisa hoje?
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--mute)' }}>
          Aprovação na hora. Dinheiro via Pix.
        </p>

        <AmountPicker value={r.amount} onChange={r.setAmount} />
        <ReasonPicker value={r.reason} onChange={r.setReason} />

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Pra calcular seu score</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Field label="Ganhos por semana" prefix="R$" value={r.weeklyEarnings} onChange={r.setWeeklyEarnings} inputMode="numeric" />
            <Field label="Corridas por semana" value={r.rides} onChange={r.setRides} inputMode="numeric" />
            <Field label="Anos rodando" value={r.years} onChange={r.setYears} inputMode="numeric" />
            <Field label="Cidade" value={r.city} onChange={r.setCity} />
          </div>
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button variant="accent" size="lg" disabled={!r.valid} onClick={r.submit} icon={<Icon.ArrowRight />} style={{ minWidth: 280 }}>
            Pedir agora
          </Button>
          <div style={{ fontSize: 12, color: 'var(--mute-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Shield /><span>Análise instantânea · sem consulta ao SPC</span>
          </div>
        </div>
      </div>
    </Screen>
  )
}
