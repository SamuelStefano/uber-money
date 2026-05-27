import { useCallback, useState } from 'react'
import { HAS_BACKEND, processDocument, fileToBase64 } from '@/lib/api'
import { useToast } from '@/components/organisms/toast-provider'
import { MOCK_OCR_CNH, MOCK_OCR_EARNINGS, MOCK_OCR_DELAY_MS } from '@/consts/mock'
import type { CnhData, EarningsData, DocKind } from '@/types/documents'

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

interface UseUploadScreenOutput {
  cnh: CnhData | null
  earnings: EarningsData | null
  loading: DocKind | null
  err: string | null
  both: boolean
  handle: (file: File, kind: DocKind) => Promise<void>
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function useUploadScreen(): UseUploadScreenOutput {
  const [cnh, setCnh] = useState<CnhData | null>(null)
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState<DocKind | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const toast = useToast()

  const handle = useCallback(async (file: File, kind: DocKind) => {
    if (!file) return
    setLoading(kind); setErr(null)
    try {
      if (HAS_BACKEND) {
        const b64 = await fileToBase64(file)
        const result = await processDocument(kind, b64, file.type as AllowedMediaType)
        if (kind === 'cnh') setCnh(result.ocr_data as CnhData)
        else setEarnings(result.ocr_data as EarningsData)
        toast.push(kind === 'cnh' ? 'CNH lida' : 'Extrato lido')
      } else {
        await sleep(MOCK_OCR_DELAY_MS)
        if (kind === 'cnh') setCnh(MOCK_OCR_CNH)
        else setEarnings(MOCK_OCR_EARNINGS)
        toast.push('Documento lido')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      toast.push('Falha ao ler. Tente outra foto.')
    } finally {
      setLoading(null)
    }
  }, [toast])

  return { cnh, earnings, loading, err, both: !!cnh && !!earnings, handle }
}
