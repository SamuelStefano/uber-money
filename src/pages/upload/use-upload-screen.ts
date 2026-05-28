import { useCallback, useState } from 'react'
import { HAS_BACKEND, processDocument, fileToBase64 } from '@/lib/api'
import { useToast } from '@/components/organisms/toast-provider'
import { MOCK_OCR_CNH, MOCK_OCR_EARNINGS, MOCK_OCR_DELAY_MS } from '@/consts/mock'
import type { CnhData, EarningsData, DocKind } from '@/types/documents'

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

interface UseUploadScreenOutput {
  cnh: CnhData | null
  earnings: EarningsData | null
  loading: DocKind | null
  err: string | null
  both: boolean
  handle: (file: File, kind: DocKind) => Promise<void>
  // Sheet de confirmação da CNH (Samuel: mostrar dados extraídos + botão "está correto?")
  cnhReviewOpen: boolean
  cnhReview: CnhData | null
  confirmCnh: (data: CnhData) => void
  reuploadCnh: () => void
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function useUploadScreen(): UseUploadScreenOutput {
  const [cnh, setCnh] = useState<CnhData | null>(null)
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState<DocKind | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [cnhReviewOpen, setCnhReviewOpen] = useState(false)
  const [cnhReview, setCnhReview] = useState<CnhData | null>(null)
  const toast = useToast()

  const handle = useCallback(async (file: File, kind: DocKind) => {
    if (!file) return
    setLoading(kind); setErr(null)
    try {
      let extracted: CnhData | EarningsData
      if (HAS_BACKEND) {
        const b64 = await fileToBase64(file)
        const result = await processDocument(kind, b64, file.type as AllowedMediaType)
        extracted = result.ocr_data as CnhData | EarningsData
      } else {
        await sleep(MOCK_OCR_DELAY_MS)
        extracted = kind === 'cnh' ? MOCK_OCR_CNH : MOCK_OCR_EARNINGS
      }
      if (kind === 'cnh') {
        setCnhReview(extracted as CnhData)
        setCnhReviewOpen(true)
        toast.push('CNH lida — confirme os dados')
      } else {
        setEarnings(extracted as EarningsData)
        toast.push('Extrato lido')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      toast.push('Falha ao ler. Tente outra foto.')
    } finally {
      setLoading(null)
    }
  }, [toast])

  const confirmCnh = useCallback((data: CnhData) => {
    setCnh(data)
    setCnhReview(null)
    setCnhReviewOpen(false)
    toast.push('CNH confirmada')
  }, [toast])

  const reuploadCnh = useCallback(() => {
    setCnh(null)
    setCnhReview(null)
    setCnhReviewOpen(false)
  }, [])

  return {
    cnh, earnings, loading, err,
    both: !!cnh && !!earnings,
    handle,
    cnhReviewOpen, cnhReview, confirmCnh, reuploadCnh,
  }
}
