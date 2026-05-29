import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { computeScoreV5, FINALIDADES, type FinalidadeId, type ScoreInputs } from '../_shared/score-rules.ts'

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

serve((req) => withAuth(req, async (req, user) => {
  let body: Record<string, unknown>
  try { body = await req.json() as Record<string, unknown> } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  const amount_brl = Number(body.amount_brl ?? body.amountBRL)
  if (!Number.isFinite(amount_brl) || amount_brl <= 0) return json({ error: 'amount_brl invalido' }, 400, req)

  const reasonRaw = String(body.finalidade_id ?? body.reason ?? '')
  const finalidade_id = REASON_TO_FINALIDADE[reasonRaw] ?? null
  if (!finalidade_id || !FINALIDADES[finalidade_id]) return json({ error: 'finalidade_id invalido' }, 400, req)

  let faturamento_mensal_brl = Number(body.faturamento_mensal_brl)
  if (!Number.isFinite(faturamento_mensal_brl) || faturamento_mensal_brl <= 0) {
    const { data: earnings } = await admin
      .from('documents').select('ocr_data').eq('user_id', user.id).eq('kind', 'print_earnings').maybeSingle()
    const income = Number((earnings?.ocr_data as { gross_monthly_income?: number } | null)?.gross_monthly_income)
    if (Number.isFinite(income) && income > 0) faturamento_mensal_brl = income
    else faturamento_mensal_brl = Number(Deno.env.get('OCR_LENIENT_INCOME') ?? '6500')
  }

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
  }

  const errors: string[] = []
  if (!Number.isFinite(inputs.tempo_uber_meses) || inputs.tempo_uber_meses < 0) errors.push('tempo_uber_meses')
  if (!Number.isFinite(inputs.dias_semana) || inputs.dias_semana < 0 || inputs.dias_semana > 7) errors.push('dias_semana')
  if (!Number.isFinite(inputs.corridas_semana) || inputs.corridas_semana < 0) errors.push('corridas_semana')
  if (!['so_uber', 'uber_secundaria', 'uber_principal'].includes(inputs.fonte_renda)) errors.push('fonte_renda')
  if (!Number.isFinite(inputs.nota_motorista) || inputs.nota_motorista < 0 || inputs.nota_motorista > 5) errors.push('nota_motorista')
  if (!['financiado', 'alugado', 'proprio'].includes(inputs.status_veiculo)) errors.push('status_veiculo')
  if (!['sim', 'ja_teve', 'nao'].includes(inputs.negativacao)) errors.push('negativacao')
  if (errors.length) return json({ error: `Campos invalidos: ${errors.join(', ')}` }, 400, req)

  return json(computeScoreV5(inputs), 200, req)
}))
