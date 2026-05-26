# Uber Money

Microcrédito on-chain instantâneo pra motorista de aplicativo (web app).
Pede no app → score aprova na hora → **Pix cai na conta**.

Construído pro Hackanation 2026 (TokenNation · Solana + Chainlink · tese RWA).

## Stack
- **Front:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Onboarding/Wallet:** Privy (login Google → carteira Solana embutida)
- **Backend:** Supabase Edge Functions (score off-chain, payout, JWT)
- **Oracle / track Chainlink:** workflow Chainlink CRE + CCIP
- **On-chain:** programa Anchor em Solana devnet (escrow PDA)
- **Pix:** Woovi (on/off-ramp)
- **Stablecoin:** USDT (Tether sponsor, track Solana paga em USDT)

## Status
🚧 Em construção. Submit inicial **31/05/2026** · Final **01/06/2026 18h** · Pitch presencial **02/06/2026** (Pavilhão da Bienal SP).
