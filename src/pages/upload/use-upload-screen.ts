import { useCallback, useState } from 'react'
import { HAS_BACKEND, processDocument, fileToBase64, NotACnhError } from '@/lib/api'
import { useToast } from '@/components/organisms/toast-provider'
import { MOCK_OCR_CNH, MOCK_OCR_EARNINGS, MOCK_OCR_DELAY_MS } from '@/consts/mock'
import type { CnhData, EarningsData, DocKind } from '@/types/documents'

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

interface UseUploadScreenOutput {
  cnh: CnhData | null
  cnhFile: File | null
  earnings: EarningsData | null
  loading: DocKind | null
  err: string | null
  both: boolean
  handle: (file: File, kind: DocKind) => Promise<void>
  reanalyzeCnh: () => Promise<void>
  deleteCnh: () => void
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function useUploadScreen(): UseUploadScreenOutput {
  const [cnh, setCnh] = useState<CnhData | null>(null)
  const [cnhFile, setCnhFile] = useState<File | null>(null)
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState<DocKind | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const toast = useToast()

  const runExtract = useCallback(async (file: File, kind: DocKind) => {
    if (HAS_BACKEND) {
      const b64 = await fileToBase64(file)
      const result = await processDocument(kind, b64, file.type as AllowedMediaType)
      return result.ocr_data as CnhData | EarningsData
    }
    await sleep(MOCK_OCR_DELAY_MS)
    return kind === 'cnh' ? MOCK_OCR_CNH : MOCK_OCR_EARNINGS
  }, [])

  const handle = useCallback(async (file: File, kind: DocKind) => {
    if (!file) return
    setLoading(kind); setErr(null)
    try {
      const extracted = await runExtract(file, kind)
      if (kind === 'cnh') {
        setCnhFile(file)
        setCnh(extracted as CnhData)
        toast.push('CNH lida — confira os dados')
      } else {
        setEarnings(extracted as EarningsData)
        toast.push('Extrato lido')
      }
    } catch (e) {
      if (e instanceof NotACnhError) {
        setErr(e.detail)
        toast.push(e.detail)
      } else {
        setErr(e instanceof Error ? e.message : String(e))
        toast.push('Falha ao ler. Tente outra foto.')
      }
    } finally {
      setLoading(null)
    }
  }, [toast, runExtract])

  const reanalyzeCnh = useCallback(async () => {
    if (!cnhFile) return
    setLoading('cnh'); setErr(null)
    try {
      const extracted = await runExtract(cnhFile, 'cnh')
      setCnh(extracted as CnhData)
      toast.push('Re-analisado')
    } catch (e) {
      if (e instanceof NotACnhError) {
        setCnh(null); setCnhFile(null)
        setErr(e.detail)
        toast.push(e.detail)
      } else {
        setErr(e instanceof Error ? e.message : String(e))
        toast.push('Falha ao re-analisar.')
      }
    } finally {
      setLoading(null)
    }
  }, [cnhFile, runExtract, toast])

  const deleteCnh = useCallback(() => {
    setCnh(null)
    setCnhFile(null)
  }, [])

  return {
    cnh, cnhFile, earnings, loading, err,
    both: !!cnh && !!earnings,
    handle, reanalyzeCnh, deleteCnh,
  }
}
