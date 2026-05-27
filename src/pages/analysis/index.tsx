import { Screen } from '@/components/atoms/screen'
import { Icon } from '@/components/atoms/icon'
import { useAnalysisScreen } from './use-analysis-screen'
import { AnalysisPulse } from './_components/analysis-pulse'
import { AnalysisStepper } from './_components/analysis-stepper'
import type { LoanDecision } from '@/types/domain'
import type { LoanRequestPayload } from '@/types/api'

interface AnalysisScreenProps {
  payload: LoanRequestPayload
  onDone: (decision: LoanDecision | null, err?: boolean) => void
}

export function AnalysisScreen({ payload, onDone }: AnalysisScreenProps) {
  const { step } = useAnalysisScreen({ payload, onDone })

  return (
    <Screen label="04 Analysis">
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 40,
      }}>
        <AnalysisPulse />
        <AnalysisStepper step={step} />
        <div style={{ marginTop: 64, fontSize: 13, color: 'var(--mute-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Shield /><span>Análise em segundos · seguro</span>
        </div>
      </div>
    </Screen>
  )
}
