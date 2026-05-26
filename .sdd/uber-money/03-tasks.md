# Tasks — Uber Money (até 02/06)

## Dia 1 (26/05) — HOJE
- [x] Scaffold Vite + React + TS + Tailwind + Wallet Adapter
- [x] Portar design (login, home, request, analysis, approved)
- [x] Adaptar login pra wallet-only (Phantom via adapter)
- [x] Programa Anchor `lib.rs` esqueleto
- [x] CRE workflow esqueleto (`cre/src/workflow.ts`)
- [x] SDD docs
- [ ] Criar repo público + abrir PR
- [ ] Deploy Anchor program em Solana Playground (devnet)
- [ ] Pedir credencial Woovi sandbox com Samuel

## Dia 2 (27/05) — terça
- [ ] Setup Supabase project + schema SQL + RLS
- [ ] Edge function `compute-score` (score off-chain)
- [ ] Edge function `request-payout` (chama Woovi sandbox)
- [ ] Edge function `woovi-webhook` (valida assinatura)
- [ ] Initialize vault na devnet + transfer USDC devnet

## Dia 3 (28/05) — quarta
- [ ] Sender EVM Solidity (Sepolia) — recebe report CRE + ccipSend
- [ ] Deploy Sender em Sepolia
- [ ] Testar CCIP v1.6 lane Sepolia→Solana devnet com dummy receiver

## Dia 4 (29/05) — quinta
- [ ] Anchor `ccip_receive` instruction (decode + transfer USDC)
- [ ] CRE workflow simulate end-to-end
- [ ] CRE workflow deploy staging

## Dia 5 (30/05) — sexta
- [ ] Integrar front com Edge Functions reais (substituir mocks)
- [ ] Polling de status do payout
- [ ] Refinar animação WOW Pix
- [ ] Gravar vídeo plano-B

## Dia 6 (31/05 sáb) — submit inicial
- [ ] Demo gravada
- [ ] README limpo
- [ ] Submit no TAIKAI

## Dia 7 (01/06 seg) — submit final
- [ ] Polish UI
- [ ] Deck/pitch
- [ ] Submit final 18h

## Dia 8 (02/06 ter) — pitch presencial
- [ ] Bienal SP 11h
