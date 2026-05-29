#!/usr/bin/env node
const PAYOUT_MAX_BRL = 10000
const BASE_INTEREST = 0.025
const MAX_INTEREST = 0.049
const POINTS = { boa: 3, media: 2, ruim: 1 }
const MAX_POINTS = 21

const cTempo = (m) => m >= 12 ? 'boa' : m >= 6 ? 'media' : 'ruim'
const cDias = (d) => d > 4 ? 'boa' : d >= 3 ? 'media' : 'ruim'
const cCorr = (c) => c >= 50 ? 'boa' : c >= 30 ? 'media' : 'ruim'
const cFonte = (f) => f === 'uber_principal' ? 'boa' : f === 'uber_secundaria' ? 'media' : 'ruim'
const cNota = (n) => n >= 4.85 ? 'boa' : n >= 4.8 ? 'media' : 'ruim'
const cVeic = (v) => v === 'proprio' ? 'boa' : v === 'alugado' ? 'media' : 'ruim'
const cNeg = (n) => n === 'nao' ? 'boa' : n === 'ja_teve' ? 'media' : 'ruim'
const installmentsFor = (a) => a <= 3 ? 1 : a <= 7 ? 2 : 3

function computeScoreV5(i) {
  const breakdown = {
    tempo_uber: cTempo(i.tempo_uber_meses),
    dias_semana: cDias(i.dias_semana),
    corridas_semana: cCorr(i.corridas_semana),
    fonte_renda: cFonte(i.fonte_renda),
    nota_motorista: cNota(i.nota_motorista),
    status_veiculo: cVeic(i.status_veiculo),
    negativacao: cNeg(i.negativacao),
  }
  if (i.negativacao === 'sim') {
    return { approved: false, rejection_reason: 'Nome negativado — não emprestamos.', score: 0, breakdown, limit_brl: 0, interest_pct: MAX_INTEREST, installments: 1, approved_amount_brl: 0 }
  }
  const points = Object.values(breakdown).reduce((acc, r) => acc + POINTS[r], 0)
  const score = Math.round((points / MAX_POINTS) * 1000)
  const baseRatio = i.negativacao === 'nao' ? 0.10 : 0.05
  const limit_brl = Math.min(i.faturamento_mensal_brl * baseRatio, PAYOUT_MAX_BRL)
  if (i.amount_brl > limit_brl) {
    return { approved: false, rejection_reason: 'Valor excede o limite disponível.', score, breakdown, limit_brl, interest_pct: MAX_INTEREST, installments: installmentsFor(i.amount_brl), approved_amount_brl: 0 }
  }
  const scoreFactor = (1 - score / 1000) * (MAX_INTEREST - BASE_INTEREST)
  const ratio = limit_brl > 0 ? i.amount_brl / i.faturamento_mensal_brl : 0
  const ratioFactor = Math.min(ratio / baseRatio, 1) * 0.005
  const interest_pct = Math.min(BASE_INTEREST + scoreFactor + ratioFactor, MAX_INTEREST)
  return { approved: true, rejection_reason: null, score, breakdown, limit_brl, interest_pct, installments: installmentsFor(i.amount_brl), approved_amount_brl: i.amount_brl }
}

const BASE = { faturamento_mensal_brl: 5000, amount_brl: 100, finalidade_id: 'pneu', tempo_uber_meses: 36, dias_semana: 5, corridas_semana: 60, fonte_renda: 'uber_principal', nota_motorista: 4.9, status_veiculo: 'proprio', negativacao: 'nao' }

const cases = [
  ['BOA: 36mo, 5d/sem, 60 corridas, principal+uber, 4.9, próprio, limpo · renda 5k, pede 100', BASE],
  ['MEDIA: 8mo, 4d, 35 corridas, secundária, 4.82, alugado, já teve · renda 5k, pede 100', { ...BASE, tempo_uber_meses: 8, dias_semana: 4, corridas_semana: 35, fonte_renda: 'uber_secundaria', nota_motorista: 4.82, status_veiculo: 'alugado', negativacao: 'ja_teve' }],
  ['RUIM: 2mo, 2d, 10 corridas, só uber, 4.5, financiado, já teve · renda 5k, pede 100', { ...BASE, tempo_uber_meses: 2, dias_semana: 2, corridas_semana: 10, fonte_renda: 'so_uber', nota_motorista: 4.5, status_veiculo: 'financiado', negativacao: 'ja_teve' }],
  ['NEGATIVADO ATIVO → rejeita', { ...BASE, negativacao: 'sim' }],
  ['AMOUNT excede limite: renda 1k, pede 1000 (limit=100)', { ...BASE, faturamento_mensal_brl: 1000, amount_brl: 1000 }],
  ['JÁ TEVE NEG → limit 5%: renda 5k, pede 250 (limit=250)', { ...BASE, negativacao: 'ja_teve', amount_brl: 250 }],
  ['CAP absoluto: renda 200k, pede 5000 (limit=10000)', { ...BASE, faturamento_mensal_brl: 200000, amount_brl: 5000 }],
]

for (const [label, inputs] of cases) {
  const r = computeScoreV5(inputs)
  console.log(`\n── ${label} ──`)
  console.log(`  approved=${r.approved}${r.rejection_reason ? ` · ${r.rejection_reason}` : ''}`)
  console.log(`  score=${r.score}/1000 · limit=R$ ${r.limit_brl.toFixed(2)} · ${(r.interest_pct * 100).toFixed(2)}%/mês · ${r.installments}x`)
  const b = r.breakdown
  console.log(`  ${b.tempo_uber[0]}/${b.dias_semana[0]}/${b.corridas_semana[0]}/${b.fonte_renda[0]}/${b.nota_motorista[0]}/${b.status_veiculo[0]}/${b.negativacao[0]} (tempo/dias/corridas/fonte/nota/veículo/neg)`)
}
