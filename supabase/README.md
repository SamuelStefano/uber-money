# Supabase Backend — Uber Money

Schema, RLS e Edge Functions decididos pelo squad multi-agente (DR-001).

## Migração
- `migrations/0001_init.sql` — schema completo (enums, tabelas, índices, RLS, triggers, função SQL `create_loan_request_with_snapshot`).

## Edge Functions
- `functions/wallet-auth` — autenticação por assinatura ed25519 da wallet (nonce → JWT Supabase). **Stub** — implementar conforme `.sdd/uber-money/02-design.md`.
- `functions/request-loan` — recebe wallet (do JWT), valida docs, chama `computeScore`, insere atomicamente `loan_requests` + `score_snapshots` + `loans` (se aprovado).
- `functions/request-payout` — valida ownership do loan, gera `correlationId`, chama Woovi `/transfer`, insere `payouts` como `pending`.
- `functions/woovi-webhook` — valida HMAC-SHA256 (secret no Vault), atualiza `payouts.status` idempotentemente.
- `functions/_shared/compute-score.ts` — regra: 30% receita bruta últimos 6 meses, juros inversamente proporcional ao score.

## Decisões trancadas (DR-001)
1. JWT sub = UUID v5(wallet, namespace por env). RLS via `auth.uid()`.
2. `loans` SEM `user_id` redundante — JOIN via `loan_requests`.
3. NUMERIC(10,2) p/ BRL; centavos na edge fn.
4. Nonce em tabela com `used_at` (não DELETE — auditoria).
5. UUID namespace via `WALLET_UUID_NAMESPACE` env (dev/prod separados).
6. Webhook secret no Supabase Vault (`get_secret('woovi_webhook_secret')`), NUNCA env var.
7. OCR mockado no MVP.
8. `on_chain_pda` nullable — programa Anchor é integração futura/paralela.
9. Botão "Simular confirmação" no demo p/ contornar falha Woovi sandbox.
10. `compute-score` é helper interno (TS), NÃO endpoint público.

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
