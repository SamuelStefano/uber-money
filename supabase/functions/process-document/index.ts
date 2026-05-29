import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { visionExtract, NotACnhError, type CnhData, type EarningsData } from '../_shared/vision.ts'

serve((req) => withAuth(req, async (req, user) => {
  let payload: { kind: 'cnh' | 'print_earnings'; imageBase64: string; mediaType?: string }
  try { payload = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  if (!['cnh', 'print_earnings'].includes(payload.kind)) return json({ error: 'Invalid kind' }, 400, req)
  if (!payload.imageBase64 || payload.imageBase64.length < 100) return json({ error: 'Empty image' }, 400, req)
  if (payload.imageBase64.length > 5_000_000) return json({ error: 'Image too large (max ~3.75MB)' }, 413, req)

  const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
  const mediaType = (payload.mediaType ?? 'image/jpeg').toLowerCase() as typeof ALLOWED_MEDIA[number]
  if (!ALLOWED_MEDIA.includes(mediaType)) {
    return json({ error: `Unsupported mediaType (use ${ALLOWED_MEDIA.join(', ')})` }, 415, req)
  }

  const ext = mediaType.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.id}/${payload.kind}-${Date.now()}.${ext}`
  const bytes = Uint8Array.from(atob(payload.imageBase64), (c) => c.charCodeAt(0))

  const { error: upErr } = await admin.storage.from('documents').upload(path, bytes, {
    contentType: mediaType,
    upsert: false,
  })
  if (upErr) return json({ error: 'Storage upload failed', details: upErr.message }, 500, req)

  let ocrData: CnhData | EarningsData
  try {
    if (payload.kind === 'cnh') {
      ocrData = await visionExtract<CnhData>('cnh', payload.imageBase64, mediaType)
    } else {
      ocrData = await visionExtract<EarningsData>('earnings', payload.imageBase64, mediaType)
    }
  } catch (e) {
    if (e instanceof NotACnhError) {
      await admin.storage.from('documents').remove([path]).catch(() => {})
      return json({ error: 'not_a_cnh', message: e.detail }, 422, req)
    }
    return json({ error: 'Vision OCR failed', details: String(e) }, 502, req)
  }

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
}))
