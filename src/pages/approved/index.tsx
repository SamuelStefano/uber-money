import { Screen } from '@/components/atoms/screen'
import { Sheet } from '@/components/molecules/sheet'
import { Receipt } from '@/components/molecules/receipt'
import { useApprovedScreen } from './use-approved-screen'
import { ApprovedHero } from './_components/approved-hero'
import { ConfettiLayer } from './_components/confetti-layer'
import { PixNotification } from './_components/pix-notification'
import type { LoanDecision } from '@/types/domain'

interface ApprovedScreenProps {
  decision: LoanDecision
  onHome: () => void
}

export function ApprovedScreen({ decision, onHome }: ApprovedScreenProps) {
  const a = useApprovedScreen({ decision })
  if (!decision) return null

  return (
    <Screen label="05 Approved" style={{ background: '#FAFAF8' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', overflow: 'hidden',
      }}>
        <ConfettiLayer dots={a.confetti} />
        <ApprovedHero
          decision={decision}
          phase={a.phase}
          release={a.release}
          onEfetuar={a.efetuar}
          onSacar={a.sacar}
          onShowReceipt={() => a.setShowReceipt(true)}
          onHome={onHome}
        />
        <PixNotification show={a.showNotif} amountBRL={decision.approvedAmountBRL} />

        <Sheet open={a.showReceipt} onClose={() => a.setShowReceipt(false)}>
          {a.receipt && <Receipt receipt={a.receipt} decision={decision} onClose={() => a.setShowReceipt(false)} />}
        </Sheet>
      </div>
    </Screen>
  )
}
