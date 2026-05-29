import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'

function mockEarnings(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  const monthlyBRL = 2800 + (Math.abs(h) % 2200)
  const rideCount = 180 + (Math.abs(h >> 7) % 120)
  return { gross_monthly_income_brl: monthlyBRL, ride_count: rideCount, mocked: true }
}

serve((req) => withAuth(req, async (req, user) => {
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
}))
