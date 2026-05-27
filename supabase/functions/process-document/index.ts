// process-document — upload + OCR via Claude Vision.
// Front envia { kind: 'cnh' | 'print_earnings', imageBase64, mediaType }
// → salva em Storage (bucket privado), roda Vision, persiste documents.ocr_data.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions } from '../_shared/cors.ts'
import { visionExtract, type CnhData, type EarningsData } from '../_shared/vision.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  let payload: { kind: 'cnh' | 'print_earnings'; imageBase64: string; mediaType?: string }
  try { payload = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  if (!['cnh', 'print_earnings'].includes(payload.kind)) return json({ error: 'Invalid kind' }, 400, req)
  if (!payload.imageBase64 || payload.imageBase64.length < 100) return json({ error: 'Empty image' }, 400, req)
  if (payload.imageBase64.length > 5_000_000) return json({ error: 'Image too large (max ~3.75MB)' }, 413, req)

  const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const
  const mediaType = (payload.mediaType ?? 'image/jpeg').toLowerCase() as typeof ALLOWED_MEDIA[number]
  if (!ALLOWED_MEDIA.includes(mediaType)) {
    return json({ error: `Unsupported mediaType (use ${ALLOWED_MEDIA.join(', ')})` }, 415, req)
  }

  // 1. Upload to storage (bucket "documents", path = userId/kind-timestamp.ext)
  const ext = mediaType.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.id}/${payload.kind}-${Date.now()}.${ext}`
  const bytes = Uint8Array.from(atob(payload.imageBase64), (c) => c.charCodeAt(0))

  const { error: upErr } = await admin.storage.from('documents').upload(path, bytes, {
    contentType: mediaType,
    upsert: false,
  })
  if (upErr) return json({ error: 'Storage upload failed', details: upErr.message }, 500, req)

  // 2. Vision extraction
  let ocrData: CnhData | EarningsData
  try {
    if (payload.kind === 'cnh') {
      ocrData = await visionExtract<CnhData>('cnh', payload.imageBase64, mediaType)
    } else {
      ocrData = await visionExtract<EarningsData>('earnings', payload.imageBase64, mediaType)
    }
  } catch (e) {
    return json({ error: 'Vision OCR failed', details: String(e) }, 502, req)
  }

  // 3. Persist documents row (upsert via unique(user_id, kind))
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .upsert(
      { user_id: user.id, kind: payload.kind, storage_url: path, ocr_data: ocrData },
      { onConflict: 'user_id,kind' },
    )
    .select('id, kind, ocr_data')
    .single()

  if (docErr) return json({ error: 'DB write failed', details: docErr.message }, 500, req)

  return json({ document_id: doc.id, kind: doc.kind, ocr_data: doc.ocr_data }, 200, req)
})
