import { Screen } from '@/components/atoms/screen'
import { useRepayScreen } from './use-repay-screen'
import { RepayHero } from './_components/repay-hero'
import type { LoanDecision } from '@/types/domain'

interface RepayScreenProps {
  decision: LoanDecision
  onHome: () => void
}

export function RepayScreen({ decision, onHome }: RepayScreenProps) {
  const state = useRepayScreen({ decision, onHome })

  return (
    <Screen label="06 Repay" style={{ background: '#FAFAF8' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <RepayHero
          phase={state.phase}
          decision={decision}
          amountBRL={state.repayInfo?.amountBRL}
          repayInfo={state.repayInfo}
          errorMsg={state.errorMsg}
          generate={state.generate}
          sign={state.sign}
          retry={state.retry}
          onHome={onHome}
        />
      </div>
    </Screen>
  )
}
