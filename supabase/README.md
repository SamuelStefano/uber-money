# Supabase Backend — Uber Money

Schema, RLS e Edge Functions decididos pelo squad multi-agente (DR-001).

## Migração
- `migrations/0001_init.sql` … `0010_cashout_replay_guard.sql` — schema, RLS, triggers, `create_loan_request_with_snapshot`, cpf_pepper per-user, cpf_hash UNIQUE, repayment on-chain, cashout replay guard.

## Edge Functions
A lista canônica e atualizada está no `README.md` da raiz. Resumo do core:
- `functions/wallet-auth` — assinatura ed25519 da wallet (nonce → JWT custom).
- `functions/score-credit` — preview do score V5 (`_shared/score-rules.ts`). NÃO assina.
- `functions/request-loan` — valida docs, computa score V5 e **assina** a attestation Ed25519 (`LOAN_V01`); insere atomicamente `loan_requests` + snapshot + `loans`.
- `functions/request-payout` — dispatcher legacy (Anchor release / Woovi). Caminho canônico de saque é `usdc-to-pix`.
- `functions/woovi-webhook` — valida HMAC-SHA256 (secret no Vault), atualiza `payouts.status` idempotentemente.
- `functions/_shared/score-rules.ts` — `computeScoreV5`: 7 critérios, escala 0–1000, determinístico.

## Decisões trancadas (DR-001)
1. JWT sub = UUID v5(wallet, namespace por env). RLS via `auth.uid()`.
2. `loans` SEM `user_id` redundante — JOIN via `loan_requests`.
3. NUMERIC(10,2) p/ BRL; centavos na edge fn.
4. Nonce em tabela com `used_at` (não DELETE — auditoria).
5. UUID namespace via `WALLET_UUID_NAMESPACE` env (dev/prod separados).
6. Webhook secret no Supabase Vault (`get_secret('woovi_webhook_secret')`), NUNCA env var.
7. OCR real via Claude Vision (`process-document`), não mais mock.
8. `cpf_hash` (sha256(cpf||pepper)) amarra loan PDA on-chain; pepper per-user no Vault.
9. `WOOVI_MODE=mock|sandbox|prod` controla o fluxo Pix.
10. `score-rules.ts` (`computeScoreV5`) é helper interno (TS), NÃO endpoint público.

## Env vars necessárias (Edge runtime)
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WALLET_UUID_NAMESPACE=<UUID por ambiente, ex: 550e8400-e29b-41d4-a716-446655440000>
WOOVI_API_KEY=<sandbox>
```

## Secrets (Vault)
```
woovi_webhook_secret  -- HMAC secret pro webhook
```
