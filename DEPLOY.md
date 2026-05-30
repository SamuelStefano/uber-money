# Deploy Uber Money — passo a passo

> Wallet de teste (devnet) + Woovi sandbox. Resto = prod-real.

## 1. Front (Vercel)
```bash
# Já tem vercel.com login? Senão: vercel login
npm i -g vercel
vercel link --yes
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SOLANA_CLUSTER  # devnet
vercel env add VITE_USDC_MINT_DEVNET # 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
vercel env add VITE_PROGRAM_ID       # 6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N
vercel --prod
```

> **Sem env setada → front roda em mock** (Phantom funciona, OCR/score/Pix simulam). Útil pra testar UI.

## 2. Supabase (Postgres + Edge + Storage)
```bash
npm i -g supabase
supabase login
supabase link --project-ref <REF>      # criar projeto no dashboard primeiro

# Schema
supabase db push                         # aplica migrations/*.sql

# Secrets (Edge runtime)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set WOOVI_API_KEY=<sandbox key>
supabase secrets set WOOVI_WEBHOOK_SECRET=<random hex>
supabase secrets set WALLET_UUID_NAMESPACE=$(uuidgen)
supabase secrets set PAYOUT_MAX_BRL=10

# Edge Functions (dev-reset NÃO vai pra prod — gated por ENVIRONMENT, só local)
supabase functions deploy wallet-auth process-document request-loan request-payout woovi-webhook \
  confirm-loan confirm-repayment prepare-repayment get-credit-status score-credit usdc-to-pix
```

Pegue o webhook URL (`https://<ref>.supabase.co/functions/v1/woovi-webhook`) e cadastre no dashboard da Woovi sandbox.

## 3. Anchor (Solana devnet)
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url devnet --keypair ~/.config/solana/id.json
solana airdrop 5

# Anchor CLI (se não tem):
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli

# Build + deploy
anchor build
anchor deploy

# Initialize vault (USDC devnet mint hardcoded)
# Ver scripts/init-vault.ts (TODO próximo PR)

# Pre-fund o vault (USDC devnet faucet: https://spl-token-faucet.com)
spl-token transfer 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 100 <VAULT_ATA>
```

## 4. Woovi sandbox
1. Criar conta sandbox em https://app.woovi.com
2. Gerar API key em **Integrações → API**
3. Cadastrar webhook URL (apontar pra Supabase: `<ref>.supabase.co/functions/v1/woovi-webhook`)
4. Pegar webhook secret e setar em `WOOVI_WEBHOOK_SECRET`

## 5. Smoke test (end-to-end)
1. Abrir front em prod.
2. Conectar Phantom em devnet.
3. Upload de CNH + print da Uber → ver OCR extrair dados.
4. Pedir empréstimo R$ 1.
5. Score aprova → "Receber via Pix" → ver Pix na conta de teste.
6. Conferir tx Solana no Solana Explorer (devnet).

## Toolchain instalado (VPS)
- ✅ Node v22 + npm v10
- ✅ Solana CLI 3.1.15 (Agave)
- ✅ Program keypair gerado: `6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N`
- ✅ Deploy wallet: `5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa`
- ⏳ Anchor CLI (precisa instalar via cargo se for buildar localmente)
- ⏳ Supabase CLI (instalar via npm)
