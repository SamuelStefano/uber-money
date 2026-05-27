import { Screen } from '@/components/atoms/screen'
import { useStore } from '@/hooks/use-store'
import { useCountUp } from '@/hooks/use-count-up'
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
          <ActivityList items={s.activity} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <RequestCreditCta onClick={onRequestCredit} />
          <ScoreCard value={78} caption="Pago em dia · ganhos consistentes · 3 anos rodando" />
          <LimitCard limit={500} hint="Até R$500 por adiantamento · juros a partir de 2,9%/mês" />
        </div>
      </div>
    </Screen>
  )
}
