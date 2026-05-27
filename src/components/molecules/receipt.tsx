import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { Money } from '@/components/atoms/money'
import { ReceiptRow } from './receipt-row'
import { dateBR, timeBR } from '@/utils/format'
import { MOCK_RECEIPT_DESTINATION } from '@/consts/mock'
import type { LoanDecision, PayoutReceipt } from '@/types/domain'

interface ReceiptProps {
  receipt: PayoutReceipt
  decision: LoanDecision
  onClose: () => void
}

export function Receipt({ receipt, decision, onClose }: ReceiptProps) {
  return (
    <div style={{ padding: '24px 40px 32px', maxWidth: 520, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'var(--accent-soft)', color: 'var(--accent-deep)',
          margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Pix />
        </div>
        <div style={{
          fontSize: 12, color: 'var(--mute)', fontWeight: 600, marginTop: 14,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Comprovante Pix</div>
        <div style={{ marginTop: 8 }}>
          <Money value={receipt.amountBRL} size={52} symbolSize={24} centsSize={20} weight={800} />
        </div>
      </div>

      <div style={{ marginTop: 24, background: 'var(--canvas)', borderRadius: 20, padding: '4px 20px' }}>
        <ReceiptRow label="Data e hora" value={`${dateBR(receipt.timestamp)} · ${timeBR(receipt.timestamp)}`} />
        <ReceiptRow label="Destino" value={MOCK_RECEIPT_DESTINATION} sub={`Chave · ${receipt.to}`} />
        <ReceiptRow label="Instituição pagadora" value="Uber Money · 24·313·102" sub="Pix · sandbox" />
        <ReceiptRow label="ID da transação" value={receipt.id} mono />
        <ReceiptRow
          label="Empréstimo"
          value={decision.loanId}
          sub={`${decision.installments}× · ${decision.interestPct.toFixed(1)}%/mês`}
          mono
          last
        />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Button full variant="secondary" size="md" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
