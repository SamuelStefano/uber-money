import { admin } from './admin.ts'
import { FINALIDADES, type FinalidadeId, type ScoreInputs } from './score-rules.ts'

const OCR_INCOME_FLOOR = Number(Deno.env.get('OCR_INCOME_FLOOR') ?? '1000')

const REASON_TO_FINALIDADE: Record<string, FinalidadeId> = {
  pneu: 'pneu',
  suspensao: 'suspensao',
  bateria_chupeta: 'bateria_chupeta',
  bateria_troca: 'bateria_troca',
  troca_oleo: 'troca_oleo',
  outro: 'outro',
  vehicle_repair: 'pneu',
  fuel: 'outro',
  emergency: 'outro',
  other: 'outro',
}

export async function normalizeScoreBody(
  body: Record<string, unknown>,
  userId: string,
): Promise<ScoreInputs | { error: string }> {
  const amount_brl = Number(body.amount_brl ?? body.amountBRL)
  if (!Number.isFinite(amount_brl) || amount_brl <= 0) return { error: 'amount_brl invalido' }

  const reasonRaw = String(body.finalidade_id ?? body.reason ?? '')
  const finalidade_id = REASON_TO_FINALIDADE[reasonRaw] ?? null
  if (!finalidade_id || !FINALIDADES[finalidade_id]) return { error: 'finalidade_id invalido' }

  let faturamento_mensal_brl = Number(body.faturamento_mensal_brl)
  if (!Number.isFinite(faturamento_mensal_brl) || faturamento_mensal_brl <= 0) {
    const { data: earnings } = await admin
      .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'print_earnings').maybeSingle()
    const income = Number((earnings?.ocr_data as { gross_monthly_income?: number } | null)?.gross_monthly_income)
    if (Number.isFinite(income) && income >= OCR_INCOME_FLOOR) {
      faturamento_mensal_brl = income
    } else {
      const fallback = Number(Deno.env.get('OCR_LENIENT_INCOME') ?? '6500')
      console.warn('[normalize-score-body] OCR income below floor, using fallback', { userId, ocr_income: income, floor: OCR_INCOME_FLOOR, fallback })
      faturamento_mensal_brl = fallback
    }
  }

  const { count: repaidCount } = await admin
    .from('loans')
    .select('id, loan_requests!inner(user_id)', { count: 'exact', head: true })
    .eq('loan_requests.user_id', userId)
    .eq('status', 'paid')

  const inputs: ScoreInputs = {
    faturamento_mensal_brl,
    amount_brl,
    finalidade_id,
    tempo_uber_meses: Number(body.tempo_uber_meses),
    dias_semana: Number(body.dias_semana),
    corridas_semana: Number(body.corridas_semana),
    fonte_renda: body.fonte_renda as ScoreInputs['fonte_renda'],
    nota_motorista: Number(body.nota_motorista),
    status_veiculo: body.status_veiculo as ScoreInputs['status_veiculo'],
    negativacao: body.negativacao as ScoreInputs['negativacao'],
    repaid_loans_count: repaidCount ?? 0,
  }

  const errors: string[] = []
  if (!Number.isFinite(inputs.tempo_uber_meses) || inputs.tempo_uber_meses < 0) errors.push('tempo_uber_meses')
  if (!Number.isFinite(inputs.dias_semana) || inputs.dias_semana < 0 || inputs.dias_semana > 7) errors.push('dias_semana')
  if (!Number.isFinite(inputs.corridas_semana) || inputs.corridas_semana < 0) errors.push('corridas_semana')
  if (!['so_uber', 'uber_secundaria', 'uber_principal'].includes(inputs.fonte_renda)) errors.push('fonte_renda')
  if (!Number.isFinite(inputs.nota_motorista) || inputs.nota_motorista < 0 || inputs.nota_motorista > 5) errors.push('nota_motorista')
  if (!['financiado', 'alugado', 'proprio'].includes(inputs.status_veiculo)) errors.push('status_veiculo')
  if (!['sim', 'ja_teve', 'nao'].includes(inputs.negativacao)) errors.push('negativacao')
  if (errors.length) return { error: `Campos invalidos: ${errors.join(', ')}` }

  return inputs
}
