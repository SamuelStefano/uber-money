// parse-uber-print — stub (Will completa OCR específico de print Uber 28/05).
// Por ora retorna mock determinístico baseado no user_id pra demo rodar end-to-end.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

// Mock determinístico — substituir por Claude Vision Earnings parser (Will).
function mockEarnings(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  const monthlyBRL = 2800 + (Math.abs(h) % 2200)
  const rideCount = 180 + (Math.abs(h >> 7) % 120)
  return { gross_monthly_income_brl: monthlyBRL, ride_count: rideCount, mocked: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  const { data: doc } = await admin
    .from('documents')
    .select('id, storage_url, ocr_data')
    .eq('user_id', user.id)
    .eq('kind', 'print_earnings')
    .maybeSingle()
  if (!doc) return json({ error: 'No earnings print uploaded' }, 400, req)

  const earnings = mockEarnings(user.id)
  const merged = { ...(doc.ocr_data ?? {}), ...earnings }
  await admin.from('documents').update({ ocr_data: merged }).eq('id', doc.id)
  return json({ earnings, mocked: true }, 200, req)
})
