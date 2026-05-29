import { Screen } from '@/components/atoms/screen'
import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { PageHeading } from '@/components/atoms/page-heading'
import { SecurityNote } from '@/components/molecules/security-note'
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

        <div style={{ marginTop: 20 }}>
          <PageHeading subtitle="Aprovação na hora. Dinheiro via Pix.">
            Quanto você precisa hoje?
          </PageHeading>
        </div>

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

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button variant="accent" size="lg" disabled={!r.valid} onClick={r.submit} icon={<Icon.ArrowRight />} style={{ minWidth: 280 }}>
            Pedir agora
          </Button>
          <SecurityNote>Análise instantânea · sem consulta ao SPC</SecurityNote>
        </div>
      </div>
    </Screen>
  )
}
