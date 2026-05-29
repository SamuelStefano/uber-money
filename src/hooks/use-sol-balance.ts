import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export function useSolBalance(): { sol: number | null; loading: boolean } {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [sol, setSol] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) { setSol(null); return }
    let cancelled = false
    setLoading(true)
    connection.getBalance(publicKey)
      .then((lamports) => { if (!cancelled) setSol(lamports / LAMPORTS_PER_SOL) })
      .catch(() => { if (!cancelled) setSol(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    const sub = connection.onAccountChange(publicKey, (acc) => {
      if (!cancelled) setSol(acc.lamports / LAMPORTS_PER_SOL)
    }, 'confirmed')

    return () => {
      cancelled = true
      try { connection.removeAccountChangeListener(sub) } catch { /* noop */ }
    }
  }, [connection, publicKey])

  return { sol, loading }
}
