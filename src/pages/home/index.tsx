import { Screen } from '@/components/atoms/screen'
import { useStore } from '@/hooks/use-store'
import { useCountUp } from '@/hooks/use-count-up'
import { useCreditStatus } from '@/hooks/use-credit-status'
import { greeting } from '@/utils/greeting'
import { BalanceCard } from './_components/balance-card'
import { ActivityList } from './_components/activity-list'
import { RequestCreditCta } from './_components/request-credit-cta'
import { ScoreCard } from './_components/score-card'
import { LimitCard } from './_components/limit-card'

interface HomeScreenProps {
  onRequestCredit: () => void
}

export function HomeScreen({ onRequestCredit }: HomeScreenProps) {
  const [s] = useStore()
  const balance = useCountUp(s.wallet.balanceBRL, { duration: 1300, initialValue: 0 })
  const firstName = (s.user?.name ?? 'Samuel').split(' ')[0]
  const { credit } = useCreditStatus()

  const scoreCaption = credit.has_request
    ? 'Calculado a partir dos seus ganhos do Uber'
    : 'Análise instantânea · sem consulta ao SPC'
  const limitHint = credit.has_request && credit.interest_pct
    ? `Juros a partir de ${(credit.interest_pct * 100).toFixed(1)}%/mês`
    : 'Análise leva segundos · libera USDC na hora'

  return (
    <Screen label="02 Home" scroll>
      <div style={{
        flex: 1, padding: '40px 48px 60px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: 32, maxWidth: 1240, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--mute)', fontWeight: 500 }}>{greeting()},</div>
            <h1 className="tight" style={{ fontSize: 40, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.03em' }}>{firstName}.</h1>
          </div>

          <BalanceCard balance={balance} pixKey={s.wallet.pixKey} />
          <ActivityList />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <RequestCreditCta onClick={onRequestCredit} />
          <ScoreCard value={credit.score} caption={scoreCaption} onUnlock={onRequestCredit} />
          <LimitCard limit={credit.limit_brl} hint={limitHint} onUnlock={onRequestCredit} />
        </div>
      </div>
    </Screen>
  )
}
