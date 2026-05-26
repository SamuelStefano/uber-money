# Design — Uber Money

## Arquitetura (3 hops: CRE → EVM → CCIP → Solana)
```
[Browser]
  ↓ connect wallet
[App web (Vite+React+TS+Tailwind, Solana Wallet Adapter)]
  ↓ POST /compute-score (assinado via wallet)
[Supabase Edge Function: compute-score]
  ↓ retorna {score, limit, interest}
[Front mostra decisão + botão "Receber Pix"]
  ↓ clica
[Edge Function: request-payout]
  ↓ chama Anchor program (admin keypair) → release_loan
  ↓ chama Woovi API → POST Pix
[Woovi → banco do user (Pix cai)]
  ↓ webhook
[Edge: woovi-webhook → marca payout confirmed]
  ↓ front (polling) → animação "Pix recebido"
```

## Trilha Chainlink CRE (paralela, exigência do prêmio)
```
HTTPTrigger → CRE Workflow → consensus median /compute-score → report ECDSA
  → writeReport(EVM Sender Sepolia) → ccipSend(SVMExtraArgsV1)
  → Anchor program @ Solana devnet (ccip_receive instruction)
```

## Stack
| Camada | Tech |
|---|---|
| Front | Vite + React 19 + TS + Tailwind v4 + framer-motion + Inter |
| Wallet | @solana/wallet-adapter-react + Phantom + Solflare |
| Backend | Supabase (Postgres + Edge Functions Deno + JWT) |
| On-chain Solana | Anchor 0.30 (escrow PDA + release_loan) |
| Chainlink | CRE workflow (TS WASM) + CCIP v1.6 (EVM Sepolia → Solana devnet) |
| Pix | Woovi sandbox (sub-conta dedicada) |
| Stablecoin | USDC devnet (Circle) |
| Hosting | Vercel (front) + Supabase (backend/edge) |

## Entidades
- `users (id, wallet_address, created_at)`
- `documents (id, user_id, kind enum[print_earnings,cnh], storage_url, ocr_data jsonb)`
- `loan_requests (id, user_id, amount_brl, reason, status enum[pending|approved|rejected], score, limit_brl, interest_pct)`
- `loans (id, request_id, user_id, principal_brl, due_date, status enum[open|paid|late], on_chain_pda, tx_release)`
- `payouts (id, loan_id, kind enum[release|repay], amount_brl, pix_key, status, woovi_correlation_id uq, woovi_payload jsonb)`
- `score_snapshots (id, request_id, inputs jsonb, score, computed_at)`

## Regras
- Score: ~30% receita bruta anual estimada (proxy: ganhos/semana × 50).
- Threshold mínimo: 60/100.
- Limite máximo: R$ 500.
- Juros: 2.9-4.9%/mês conforme score.
- Anti-double: 1 empréstimo aberto por wallet (enforced no PDA do contrato Anchor).
- LGPD: nenhum dado pessoal on-chain; só hash/wallet address.

## Decisões importantes (registro)
- **Wallet-only:** sem Google/Uber OAuth → reduz LGPD scope + UX cripto-native (decisão Samuel, 26/05).
- **CRE obrigatório:** prêmio Chainlink exige "workflows CRE" (TAIKAI), não basta Data Feeds.
- **Stablecoin:** USDC (não BRLA — não existe em Solana; não USDT por compatibilidade com Woovi Stablecoins API).
- **Cuts pré-decididos** (red-team 26/05): CNH out, OCR/IA do print out do caminho crítico (input manual de ganhos), CRE só se Day 1 fechar dummy receiver.

## Riscos & mitigações
1. **CRE→Solana em 6 dias com 0 Rust** — mitigação: Day 1 dummy receiver, Codigo AI pra gerar Anchor.
2. **Phantom mobile + devnet flaky no palco** — mitigação: vídeo gravado plano-B.
3. **Woovi sandbox timeout** — mitigação: limite hard R$ 10, polling com retry, valor pré-transferido como prova.
4. **Custódia chave admin** — env var em Supabase secret, NUNCA no front.
