import { Screen } from '@/components/atoms/screen'
import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { PageHeading } from '@/components/atoms/page-heading'
import { SecurityNote } from '@/components/molecules/security-note'
import { UploadZone } from './_components/upload-zone'
import { CnhReviewCard } from './_components/cnh-review-card'
import { useUploadScreen } from './use-upload-screen'
import type { EarningsData, UploadedDocuments } from '@/types/documents'

interface UploadScreenProps {
  onDone: (docs: UploadedDocuments) => void
}

const renderEarnings = (d: EarningsData) =>
  d?.gross_monthly_income
    ? `R$ ${Number(d.gross_monthly_income).toFixed(0)}/mês · ${d.ride_count ?? '?'} corridas`
    : 'Lido'

export function UploadScreen({ onDone }: UploadScreenProps) {
  const { cnh, cnhFile, earnings, loading, err, both, handle, reanalyzeCnh, deleteCnh } = useUploadScreen()

  return (
    <Screen label="02.5 Upload" scroll>
      <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <div style={{ marginTop: 20 }}>
          <PageHeading subtitle="Sua CNH e a tela de ganhos da semana. Vamos ler os números pra calcular seu score.">
            Pra começar, envie 2 fotos.
          </PageHeading>
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {cnh ? (
            <CnhReviewCard
              data={cnh}
              file={cnhFile}
              analyzing={loading === 'cnh'}
              onReanalyze={reanalyzeCnh}
              onDelete={deleteCnh}
            />
          ) : (
            <UploadZone
              label="Sua CNH"
              hint="Frente, boa luz · JPG, PNG ou PDF"
              onFile={(f) => handle(f, 'cnh')}
              loading={loading === 'cnh'}
              result={null}
              renderResult={() => ''}
            />
          )}
          <UploadZone<EarningsData>
            label="Tela de ganhos (Uber)"
            hint="Print do app"
            onFile={(f) => handle(f, 'print_earnings')}
            loading={loading === 'print_earnings'}
            result={earnings}
            renderResult={renderEarnings}
          />
        </div>

        {err && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#FEE', color: '#900', fontSize: 13 }}>{err}</div>}

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button
            variant="accent"
            size="lg"
            disabled={!both}
            onClick={() => onDone({ cnh, earnings })}
            icon={<Icon.ArrowRight />}
            style={{ minWidth: 280 }}
          >
            Continuar
          </Button>
          <SecurityNote>Seus dados ficam off-chain (LGPD). Só o score vai pra blockchain.</SecurityNote>
        </div>
      </div>
    </Screen>
  )
}
