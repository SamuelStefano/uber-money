# Uber Money 💸

**Microcrédito on-chain instantâneo para motoristas de aplicativo.**

Pede no app → score off-chain aprova na hora → **Pix cai na conta em segundos**. Construído para o **Hackanation 2026** (TokenNation · Solana + Chainlink · tese RWA).

## Pitch
> Furou o pneu? Acabou a gasolina? O dinheiro cai no seu Pix em segundos. Score on-chain, juros baixos, sem consulta ao SPC.

## Datas
- **Submit inicial:** 31/05/2026 23h
- **Submit final:** 01/06/2026 18h
- **Pitch presencial:** 02/06/2026, Pavilhão da Bienal SP

## Stack
| Camada | Tech |
|---|---|
| Front | Vite + React 19 + TS + Tailwind v4 + framer-motion |
| Wallet | `@solana/wallet-adapter` (Phantom · Solflare) |
| Backend | Supabase (Postgres + Edge Functions Deno + JWT) |
| On-chain | Anchor 0.30 — escrow PDA, `release_loan` instruction |
| Oráculo | Chainlink CRE workflow (TS WASM) + **CCIP v1.6** → Solana |
| Pix | Woovi sandbox (sub-conta dedicada) |
| Stablecoin | USDC devnet |
| Hosting | Vercel |

## Como rodar
```bash
npm install
npm run dev
```
Abre em `http://localhost:5173`. Conecta com Phantom em **devnet**.

## Estrutura
```
/                     # Front Vite+React (web app)
  src/
    main.tsx
    App.tsx           # Router + 5 telas
    components.tsx    # UI primitives (Button, Card, Money, etc)
    screens.tsx       # Login, Home, Request, Analysis, Approved
    services.ts       # Mocks (substituíveis pela Edge Function real)
    providers/
      WalletProvider.tsx
programs/uber-money/  # Programa Anchor (Rust/Solana)
cre/                  # Workflow Chainlink CRE (TS)
supabase/             # Schema + Edge Functions
.sdd/uber-money/      # Spec-driven docs (requirements, design, tasks)
```

## Status
🚧 **Em construção (~6 dias até o pitch).**

- ✅ Scaffold front + 5 telas com mock data
- ✅ Wallet Adapter (Phantom devnet)
- ✅ Programa Anchor (esqueleto Rust)
- ✅ CRE workflow (esqueleto TS)
- ✅ Supabase schema + Edge Function stubs
- ⏳ Deploy Anchor em devnet
- ⏳ Sender EVM (Sepolia) + CCIP receiver
- ⏳ Edge Functions reais (Woovi sandbox)
- ⏳ Plano-B: vídeo gravado da demo

## Decisões trancadas
- **Auth:** wallet-only (Phantom externa), sem login social/Uber. Mais cripto-native, menos LGPD scope.
- **Stablecoin:** USDC devnet (BRLA não existe em Solana; USDT track-pagamento, mas Woovi tem produto USDC nativo).
- **Chainlink:** **CRE workflow obrigatório** (exigência oficial do prêmio: "2 melhores com workflows CRE") + CCIP v1.6 pra entregar em Solana.
- **Dados sensíveis:** OFF-CHAIN no Supabase (LGPD). Só hash/wallet/PDA on-chain.
- **Limite hard de payout:** R$ 10 sandbox (anti-drenar carteira na demo).

## Time
Samuel Stefano (lead Uber Money) · William Rodrigo (lead ChainOil) · Tainan Fidelis (TL/arquitetura) · Orlando Souza (mentor cripto) · Josyani/Lídia (front).
