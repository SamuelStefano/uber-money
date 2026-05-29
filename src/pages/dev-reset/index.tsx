import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Screen } from '@/components/atoms/screen'
import { Button } from '@/components/atoms/button'
import { Field } from '@/components/atoms/field'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string

export function DevResetScreen() {
  const wallet = useWallet()
  const [secret, setSecret] = useState('')
  const [walletAddr, setWalletAddr] = useState(wallet.publicKey?.toBase58() ?? '')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<string | null>(null)

  const run = async () => {
    setBusy(true); setOut(null)
    try {
      const r = await fetch(`${URL_}/functions/v1/dev-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-secret': secret.trim() },
        body: JSON.stringify({ wallet: walletAddr.trim() }),
      })
      const data = await r.json()
      setOut(JSON.stringify(data, null, 2))
    } catch (e) {
      setOut(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen label="dev/reset" scroll>
      <div style={{ flex: 1, padding: '40px 48px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <h1 className="tight" style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
          Reset de carteira
        </h1>
        <p style={{ marginTop: 8, color: 'var(--mute)', fontSize: 14 }}>
          Endpoint privado pra gravação de demo. Apaga loans, payouts, snapshots, documentos,
          storage e auth.users dessa wallet. Não toca PDAs on-chain.
        </p>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Wallet (base58)" value={walletAddr} onChange={setWalletAddr} placeholder="..." />
          <Field label="Secret" value={secret} onChange={setSecret} placeholder="x-dev-secret" />
        </div>

        <div style={{ marginTop: 24 }}>
          <Button variant="accent" size="lg" loading={busy} onClick={run} disabled={!secret || !walletAddr}>
            Resetar agora
          </Button>
        </div>

        {out && (
          <pre style={{
            marginTop: 20, padding: 14, borderRadius: 12,
            background: '#fff', border: '1px solid var(--line)',
            fontSize: 12, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{out}</pre>
        )}
      </div>
    </Screen>
  )
}
