import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isValidCpf } from './cpf.ts'
import { sha256Concat, bufToHex, hexToBuf } from './crypto.ts'

export type CpfHashResult =
  | { ok: true; cpfHashHex: string; cpfHash: Uint8Array }
  | { ok: false; error: string; status: number }

// Deriva cpf_hash = sha256(cpf || pepper) a partir da CNH (OCR) + pepper do user.
// Fonte única: tanto request-payout (release) quanto confirm-loan derivam aqui.
export async function deriveCpfHash(admin: SupabaseClient, userId: string): Promise<CpfHashResult> {
  const { data: cnh } = await admin
    .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'cnh').maybeSingle()
  const cpfRaw = ((cnh?.ocr_data as { cpf?: string } | null)?.cpf ?? '').replace(/\D/g, '')
  if (!cpfRaw || cpfRaw.length !== 11) return { ok: false, error: 'CPF not extracted from CNH', status: 400 }
  if (!isValidCpf(cpfRaw)) return { ok: false, error: 'CPF da CNH falhou validação módulo 11', status: 400 }

  const { data: userRow } = await admin.from('users').select('cpf_pepper').eq('id', userId).maybeSingle()
  const pepperHex = typeof userRow?.cpf_pepper === 'string' ? userRow.cpf_pepper : null
  if (!pepperHex) return { ok: false, error: 'User pepper not initialized', status: 500 }

  const cpfHash = await sha256Concat(new TextEncoder().encode(cpfRaw), hexToBuf(pepperHex))
  return { ok: true, cpfHashHex: '\\x' + bufToHex(cpfHash), cpfHash }
}
