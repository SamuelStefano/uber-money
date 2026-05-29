import { motion } from 'framer-motion'
import { Screen } from '@/components/atoms/screen'
import { PageHeading } from '@/components/atoms/page-heading'
import { useStore } from '@/hooks/use-store'
import { useCountUp } from '@/hooks/use-count-up'
import { useCreditStatus } from '@/hooks/use-credit-status'
import { BalanceCard } from './_components/balance-card'
import { ActivityList } from './_components/activity-list'
import { RequestCreditCta } from './_components/request-credit-cta'
import { ScoreCard } from './_components/score-card'
import { LimitCard } from './_components/limit-card'
import { HomeBackdrop } from './_components/home-backdrop'

interface HomeScreenProps {
  onRequestCredit: () => void
}

const container = { animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const item = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
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
      <HomeBackdrop />
      <motion.div
        variants={container}
        initial="initial"
        animate="animate"
        style={{
          flex: 1, padding: '56px 48px 60px', position: 'relative', zIndex: 1,
          display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 36, maxWidth: 1240, margin: '0 auto', width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <motion.div variants={item}>
            <PageHeading subtitle="Aqui está teu dinheiro e o que dá pra fazer com ele hoje.">
              Bom turno,<br />
              <span style={{ fontWeight: 900, fontStyle: 'italic' }}>{firstName}.</span>
            </PageHeading>
          </motion.div>

          <motion.div variants={item}>
            <BalanceCard balance={balance} pixKey={s.wallet.pixKey} />
          </motion.div>

          <motion.div variants={item}>
            <ActivityList />
          </motion.div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <motion.div variants={item}>
            <RequestCreditCta onClick={onRequestCredit} />
          </motion.div>
          <motion.div variants={item}>
            <ScoreCard value={credit.score} caption={scoreCaption} onUnlock={onRequestCredit} />
          </motion.div>
          <motion.div variants={item}>
            <LimitCard limit={credit.limit_brl} hint={limitHint} onUnlock={onRequestCredit} />
          </motion.div>
        </div>
      </motion.div>
    </Screen>
  )
}
