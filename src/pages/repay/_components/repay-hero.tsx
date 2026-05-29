import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { Money } from '@/components/atoms/money'
import { Pill } from '@/components/atoms/pill'
import { Spinner } from '@/components/atoms/spinner'
import { QrCodeDisplay } from '@/components/atoms/qr-code-display'
import { CopyButton } from '@/components/molecules/copy-button'
import { TxLink } from '@/components/molecules/tx-link'
import { dateBR } from '@/utils/format'
import type { RepayPhase, LoanDecision } from '@/types/domain'

interface RepayHeroProps {
  phase: RepayPhase
  decision: LoanDecision
  amountBRL: number | undefined
  repayInfo: {
    brcode: string
    qrCodeImage: string
    txRepay: string | null
  } | null
  errorMsg: string | null
  generate: () => Promise<void>
  sign: () => Promise<void>
  retry: () => void
  onHome: () => void
}

function SpinnerRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Spinner size={40} />
      <span style={{ fontSize: 15, color: 'var(--mute)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function GhostButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 13, color: 'var(--mute)', fontWeight: 500, padding: '6px 12px',
      }}
    >
      {children}
    </button>
  )
}

export function RepayHero({
  phase, decision, amountBRL, repayInfo, errorMsg, generate, sign, retry, onHome,
}: RepayHeroProps) {
  const displayAmount = amountBRL ?? decision.approvedAmountBRL

  return (
    <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          {phase === 'done' ? 'Empréstimo liquidado' : 'Pagamento do empréstimo'}
        </div>
        <Money value={displayAmount} size={96} symbolSize={42} centsSize={36} weight={800} />
      </div>

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <Pill tone="paper" size="md">
            <span>{decision.installments}× · {decision.interestPct.toFixed(1)}%/mês</span>
            <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
            <span>vence {dateBR(decision.dueDate)}</span>
          </Pill>
          <Button variant="accent" size="lg" onClick={generate} style={{ minWidth: 280 }}>
            Pagar empréstimo
          </Button>
          <GhostButton onClick={onHome}>Voltar à home</GhostButton>
        </div>
      )}

      {phase === 'generating' && <SpinnerRow label="Gerando cobrança..." />}

      {phase === 'pix_pending' && repayInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <Pill tone="info" dot pulse size="md">Aguardando Pix</Pill>
          <QrCodeDisplay src={repayInfo.qrCodeImage} size={200} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div style={{
              fontSize: 11, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
              color: 'var(--mute)', wordBreak: 'break-all',
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 10, padding: '10px 14px', textAlign: 'left',
            }}>
              {repayInfo.brcode}
            </div>
            <CopyButton value={repayInfo.brcode} label="Código" size="md" />
          </div>
          <GhostButton onClick={onHome}>Pagar depois</GhostButton>
        </div>
      )}

      {phase === 'pix_confirmed' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.CheckCircle size={36} color="var(--accent-deep)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Pix recebido</div>
          <Pill tone="accent" dot size="md">Pronto pra liquidar onchain</Pill>
          <Button variant="accent" size="lg" onClick={sign} icon={<Icon.Shield size={18} />} style={{ minWidth: 280 }}>
            Liquidar na blockchain
          </Button>
          <GhostButton onClick={onHome}>Depois</GhostButton>
        </div>
      )}

      {phase === 'signing' && <SpinnerRow label="Aprove no Phantom..." />}

      {phase === 'tx_pending' && <SpinnerRow label="Confirmando onchain..." />}

      {phase === 'done' && repayInfo?.txRepay && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.CheckCircle size={40} color="var(--accent-deep)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Empréstimo liquidado!</div>
          <div style={{ fontSize: 12, color: 'var(--mute)' }}>
            tx Solana: <TxLink hash={repayInfo.txRepay} cluster="devnet" short />
          </div>
          <Button variant="primary" size="lg" onClick={onHome} style={{ minWidth: 280 }}>
            Voltar ao início
          </Button>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Pill tone="danger" size="md">{errorMsg ?? 'Algo deu errado'}</Pill>
          <Button variant="secondary" size="lg" onClick={retry} style={{ minWidth: 280 }}>
            Tentar novamente
          </Button>
          <GhostButton onClick={onHome}>Voltar à home</GhostButton>
        </div>
      )}
    </div>
  )
}
