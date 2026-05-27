# DR-001 — Squad Audit (CONSENSUS FINAL)

**Data:** 2026-05-26
**Modo:** squad-review (10 agentes, 2 fases, divergente → convergente)
**Status:** ✅ FECHADO — execução autorizada nas decisões ratificadas
**Repo:** `~/uber-money` · branch `feat/real-backend` · PR #2 aberta
**Deadline:** 31/05 submit · 01/06 final · 02/06 pitch Bienal SP

---

## 0. Fatos travados (verificados em código, NÃO se vota)

| # | Fato | Evidência | Status |
|---|---|---|---|
| F1 | Edge Function `compute-score` NÃO existe — só helper em `_shared/`. Workflow CRE → 404. | `ls supabase/functions/` | ✅ |
| F2 | Reason enum mismatch FE↔BE — front envia `pneu/combustivel/manutencao/outro`, backend espera `emergency/vehicle_repair/fuel/other`. 100% dos pedidos = 500 silencioso em prod. | `screens.tsx:293` vs `request-loan/index.ts:18` + `0001_init.sql:6` | ✅ |
| F3 | `WALLET_UUID_NAMESPACE` default = RFC 4122 DNS canônica (`6ba7b810-9dad-11d1-80b4-00c04fd430c8`). user_id determinístico globalmente se não trocar. | `.env.example:12` | ✅ |
| F4 | Caminho crítico front roda 100% em mock mesmo com backend deployado. `screens.tsx:12,405,474` importa `requestCredit`/`sendPix` de `services.ts` (mock, `ALWAYS_APPROVE=true`). `lib/api.ts:67,73` reais nunca chamados. | grep | ✅ |
| F5 | Anchor program é órfão. `release_loan` só em `lib.rs:38`. Zero chamadas em `supabase/functions/` ou `src/`. `tx_release` e `on_chain_pda` NULL sempre. | grep | ✅ |
| F6 | `@chainlink/cre-sdk` NÃO está no `package.json`. CRE workflow não compila. | `package.json` | ✅ |
| F7 | Sender Solidity (Sepolia) NÃO existe. Zero `.sol`. | find | ✅ |
| F8 | Anchor `ccip_receive` NÃO existe. Sem dep `chainlink-ccip` em `Cargo.toml`. | grep | ✅ |
| F9 | `request-payout` chama `/charge` (cria QR cobrança), NÃO envia Pix de saída. Pitch "Pix cai na sua conta" é falso com endpoint atual. | `request-payout/index.ts:66` | ✅ |
| F10 | `solanaWallet` hardcoded `0x000…000` no CRE workflow. Entregaria USDC pra wallet zero. | `cre/src/workflow.ts:44` | ✅ |
| F11 | Anchor NÃO buildado nem deployado. Sem `.so`, sem IDL, testes placeholder. | filesystem | ✅ |
| F12 | Vídeo plano-B NÃO existe. Agendado Day 5 (30/05) junto com 4 outras tarefas críticas. | `03-tasks.md:35` | ✅ |
| F13 | `WalletProvider.tsx:12` usa `autoConnect`. Phantom conectado pula LoginScreen visualmente. | leitura | ✅ |
| F14 | `App.tsx:52` não checa `decision.approved` — só `err \|\| !decision`. Backend rejeitado vira "Aprovado" na UI. | leitura | ✅ |
| F15 | `MAX_AMOUNT_USDC = 100 USDC` (~R$500) vs `PAYOUT_MAX_BRL=10`. Gap 50× desnecessário. | `lib.rs:16` + `.env.example:24` | ✅ |

---

## 1. Decisões consolidadas (resultado da votação Fase 2)

Convenção: ✅ RATIFY · ⚠️ AMEND · ❌ REJECT.

### ✅ D1 — Cortar CCIP / Anchor `ccip_receive` / Sender Solidity (default)
**Votos:** 8 RATIFY · 1 AMEND (Schema) · 1 REJECT (CRE)
**Consenso:** RATIFY com **gate obrigatório**: ler edital TAIKAI **HOJE 26/05 até 23h**. Se edital prova "CRE obrigatório literal", reverte pra **D1-alt** (kill-switch automático 30/05 18h). Default sem leitura = **D1 (corta CRE)**. Não aceitar "decidir amanhã".
**Substituto narrativo:** Consulta a Chainlink Data Feed simbólica dentro de `compute-score` ou no Anchor — mantém badge Chainlink sem comprometer 4 dias.
**Dissidência registrada:** Agente 6 (CRE) defende D1-alt como default; aceita D1 só se edital negar CRE obrigatório.

### ⚠️ D2 — Conectar frontend ao backend real (substituir mocks)
**Votos:** 4 RATIFY · 6 AMEND
**Consenso (com emendas):**
- Em `screens.tsx`: trocar `requestCredit` → `requestLoan`, `sendPix` → `requestPayout`.
- **Remover a flag `ALWAYS_APPROVE` de `services.ts`** (não só deixar de chamar).
- **Sem fallback silencioso try/catch → mock.** Se backend falhar, mostrar erro visual claro ("Modo demonstração — backend indisponível") ou banner "DEMO MODE".
- **Guard obrigatório** `if (!decision.approved) navigate('rejection')` (cobre F14). Criar tela mínima de rejeição.
- **Polling/Realtime no payout obrigatório.** Real `requestPayout` retorna `{status:'pending'}`; UI precisa esperar webhook confirmar via Supabase Realtime em `payouts:loan_id=eq.X` OU polling a cada 2s.
- **Atomicidade request+loan:** RPC `create_request_and_loan` única (não 2 inserts separados como hoje em `request-loan/index.ts:33-61`).

### ✅ D3 — Fix reason enum mismatch
**Votos:** 9 RATIFY · 1 AMEND (Backend)
**Consenso:** Map em `src/lib/api.ts:requestLoan` **E** guard 400 em `request-loan/index.ts` (defesa em camadas — sem o guard, caller direto via curl bypassa).
```ts
const REASON_MAP = { pneu:'vehicle_repair', combustivel:'fuel', manutencao:'vehicle_repair', outro:'other' }
```

### ⚠️ D4 — Criar Edge Function `compute-score` standalone
**Votos:** 5 RATIFY · 5 AMEND
**Consenso:** **Condicional a D1.** Se D1 (corta CRE), NÃO criar (superfície de ataque sem call site). Se D1-alt (CRE vivo), obrigatório no Bloco 2 — sem isso o workflow CRE quebra no `fetchScore`. Se criar, exigir auth obrigatório (JWT) + rate-limit + Zod validation.

### ⚠️ D5 — Trocar `/charge` pra fluxo Pix correto
**Votos:** 1 RATIFY · 9 AMEND
**Consenso:** **Default = D5-b (narrativa honesta).** Deadline hard pra credencial Woovi sandbox payout: **27/05 12h**. Se sair, upgrade pra D5-a; se não, congelar D5-b com disclaimer explícito no Receipt: "sandbox · QR de cobrança · em produção: `/transfer` direto".

### ✅ D6 — Hardening de segurança crítico (não-negociável)
**Votos:** 10 RATIFY (todos com adições)
**Consenso (lista mestre — Bloco 1 ou início Bloco 2):**
- **F3 fix:** Remover valor real do `.env.example` (substituir por placeholder `<run uuidgen>`). Adicionar `if (UUID_NAMESPACE === RFC_DEFAULT) Deno.exit(1)` em `wallet-auth/index.ts`.
- **CORS whitelist explícita:** Trocar `*` em `_shared/cors.ts` por `[VERCEL_PROD_URL, 'http://localhost:5173']`. Manter `*` apenas para `woovi-webhook`. Aplicar a `process-document`, `wallet-auth`, `request-loan`, `request-payout`.
- **Nonce atomic:** Substituir SELECT+UPDATE em `wallet-auth/index.ts:69-79` por `UPDATE nonces SET used_at=now() WHERE wallet=$1 AND value=$2 AND used_at IS NULL RETURNING id` (rowsAffected=1). **Bloco 1, ANTES de qualquer integração real.**
- **Income clamp:** Em `_shared/compute-score.ts`, clampar `gross_monthly_income ∈ [0, 50000]`. Rejeitar `confidence:'low'` ou campos faltantes.
- **pixKey ownership parcial:** Quando `pixKeyType==='cpf'`, validar `pixKey === ocrData.cpf`.
- **Rate-limit em endpoints caros:** `process-document` (Anthropic API drain risk) e `wallet-auth/get_nonce` (brute force). Limite simples: 10 req/h por IP.
- **RPC `SET search_path`:** Adicionar `SET search_path = public, pg_temp` em `create_loan_request_with_snapshot` e na nova RPC `create_request_and_loan`. SECURITY DEFINER sem search_path = privilege escalation vector.
- **Admin keypair:** Vive em **Supabase Vault** (não env var, não filesystem). Pré-requisito hard de D10. Boot-check: rejeitar keypair com saldo > 50 USDC (limita blast radius).

### ✅ D7 — Vídeo plano-B HOJE 26/05
**Votos:** 10 RATIFY
**Consenso:** **Prioridade #1 absoluta.** Gravar 90s da UI atual (mocks) HOJE, antes de qualquer outra coisa. Upload YouTube unlisted. Re-gravar 30/05 com backend real se houver tempo. **Bloqueio explícito:** se vídeo escorregar pra Day 5, D7 vira letra morta.

### ✅ D8 — Remover badges "on-chain" / "Solana" até Anchor de fato chamado
**Votos:** 10 RATIFY (hardline)
**Consenso:** Limpar:
- `screens.tsx:233` (badge "on‑chain")
- `screens.tsx:391-392` (loading "Calculando seu score on‑chain…", "Validando empréstimo na Solana…")
- `screens.tsx:453` (footer "Solana · Chainlink CRE · Woovi")
- `screens.tsx:609` (Receipt "Solana devnet · Woovi sandbox")
- `components.tsx` FooterChips ("Solana", "Chainlink")

Badge volta SÓ quando `loans.tx_release IS NOT NULL` e validável via Solana Explorer.

### ✅ D9-b — Manter cap UI em R$ 1/5/10 (honestidade técnica)
**Votos:** 7 RATIFY D9-b · 3 outros (A2 D9-c com disclaimer pré-tap, A9 RATIFY sobe com disclaimer)
**Consenso forte:** **Manter `AMOUNTS = [1, 5, 10]` atual.** Investir em narrativa "primeiro empréstimo simbólico, prod escala pra R$500 via cap configurável". Argumentos vencedores:
- Risco regulatório CDC art. 52 (oferta de crédito que não pode honrar).
- Vídeo plano-B com "Aprovado R$200, cai R$10" é evidência editorial pegável.
- Juiz técnico testando ao vivo "tenta R$200" → demo quebra publicamente.

### ⚠️ D10 — Anchor build + tests + deploy
**Votos:** 4 RATIFY · 6 AMEND
**Consenso:**
- **CLI local** (NÃO Playground — preserva `target/deploy/uber_money-keypair.json` e Program ID).
- Samuel buda `anchor build` localmente, compartilha `.so` + `target/idl/uber_money.json`.
- **Reduzir `MAX_AMOUNT_USDC` de 100 → 10 USDC** (consenso médio entre 5 e 10; 10 é round + 2.5× margem cambial vs PAYOUT_MAX_BRL=10).
- **Admin keypair em Supabase Vault** (não env). Decisão registrada como pré-requisito hard.
- Caller (Edge Function) cria ATA do borrower (`createAssociatedTokenAccountInstruction`) antes de `release_loan`.
- **6 testes mocha mínimos** antes de deploy: happy path release+repay, double-spend, score baixo, amount>cap, repay underpaid, repay inexistente. Adicionar 7º: ATA ausente.
- **Condicional a D1:** Se D1 corta CRE, mantém `release_loan` chamado pelo `request-payout` via admin keypair. Se D1-alt, integra com `ccip_receive` (4 dias, alto risco).

### ✅ D11 — Pitch deck 6 slides + dry-run 3x
**Votos:** 10 RATIFY (algumas emendas)
**Consenso:** Capa, Problema, Solução (UI screenshot), Arquitetura (1 diagrama), Diferencial (Chainlink + Pix), CTA. Esboço no Bloco 3 (não Bloco 4). Dry-run **em hotspot 4G** simulando WiFi ruim, pelo menos 48h antes do pitch. Se D1-alt vencer, slide Diferencial inclui screenshot `cre workflow simulate` + tx hash CCIP Sepolia + tx Solana.

### ✅ D12 — RPC Solana alternativo (Helius/QuickNode)
**Votos:** 10 RATIFY (1 AMEND)
**Consenso:** Trocar `clusterApiUrl('devnet')` em `WalletProvider.tsx:8` por `import.meta.env.VITE_SOLANA_RPC` com fallback. **Emenda crítica (A8):** Helius/QuickNode API key NUNCA no front (vaza no bundle Vercel). Proxy via Edge Function `solana-rpc-proxy` ou usar endpoint público sem key.

### ✅ D13 — Resposta Q&A pré-escrita "como motorista comum usa?"
**Votos:** 10 RATIFY
**Consenso:** Documento em `.sdd/uber-money/pitch-qa.md`. ATUALIZADO 27/05: Privy/Magic.link DROPADOS — "daria mais trabalho que ajudaria" (Samuel). Resposta pra "como motorista comum usa?" vira "wallet-only é proposital: zero email/dados, só assinatura. Roadmap v2 pode incluir custódia simplificada, mas hoje a tese é cripto-native real." Resposta pra "Phantom cair?" → "vídeo plano-B existe (D7)".

---

## 2. Furos novos identificados na Fase 2 (Red-team)

Aceitar como **observações pós-vote**. Backlog pós-hackathon a menos que indicado:

- **NOVO-1 (média):** `installments` em `request-loan/index.ts:68` é hardcoded ternário (`<=200?2 : <=350?3 : 4`). Não está em `score_snapshots.inputs`, não é versionado. Mover pra `_shared/compute-score.ts` com `installments_rule_version` no snapshot. **5 minutos, fazer no Bloco 2.**
- **NOVO-2 (média):** `score_snapshots.inputs` JSONB sem `schema_version`. Adicionar `p_inputs_version INT` ao RPC. **Backlog pós-hack.**
- **Gap-A (LGPD):** PII em `score_snapshots.inputs` e `documents.ocr_data` sem TTL/redaction. **Backlog pós-hack.**
- **Gap-B (cost drain):** Sem rate-limit em `process-document` = Anthropic API drain via CORS aberto. **Coberto por D6.**
- **Gap-C (token replay):** JWT do `wallet-auth` 24h sem rotação real. Refresh token mintado mas nunca usável. **Cobrir em D6 com TTL 1h + remover refresh_token órfão.**

---

## 3. Riscos não-resolvidos restantes

1. **CRE obrigatório ou não?** Resolução: leitura edital TAIKAI **HOJE até 23h** (gate D1 vs D1-alt).
2. **Cred Woovi `/transfer`** liberada? Deadline 27/05 12h (gate D5-a vs D5-b).
3. ~~**Embedded wallet** (Privy/Magic): só Q&A escrito (D13), implementação no v2.~~ **DROPADO 27/05** — wallet-only continua, sem fallback custodial.

---

## 4. Ordem de execução (autorizada)

### Bloco 1 — HOJE 26/05 (até dormir)
1. **D7** — Gravar vídeo plano-B (1h) ← ABSOLUTA PRIORIDADE
2. **Ler edital TAIKAI** — gate D1 vs D1-alt (15min)
3. **D3** — REASON_MAP em api.ts + guard 400 em request-loan (10min)
4. **D6 (parcial crítico):**
   - `.env.example` UUID fix + boot-check (10min)
   - Nonce atomic UPDATE (15min) ← BLOQUEANTE de D2
   - CORS whitelist em fns user-facing (10min)
5. **D8** — Remover badges "on-chain" e "Solana devnet" da UI (20min)
6. Setup Supabase (link, push schema, deploy fns, secrets) — se tempo

### Bloco 2 — 27/05
7. **D2** — Substituir mocks por real (requestLoan/requestPayout) + remover ALWAYS_APPROVE + guard `approved` + polling
8. **D6 restante** — income clamp, pixKey CPF, rate-limit, search_path em RPCs
9. **D5** — `/transfer` se cred Woovi sair até 12h; senão D5-b
10. **NOVO-1** — `installments` em compute-score
11. **D4** — Apenas se D1-alt (CRE mantido)

### Bloco 3 — 28-29/05
12. **D10** — Anchor build + 6 testes + admin keypair em Vault + deploy + init_vault + pré-fund
13. **D12** — RPC alternativo (com proxy/sem key no front)
14. **D11 (esboço)** — Pitch deck draft
15. **D13** — `pitch-qa.md`
16. Se D1-alt: spike CRE + Sender Solidity (kill-switch 30/05 18h)

### Bloco 4 — 30-31/05
17. **D7 re-take** — Re-gravar vídeo com backend real
18. **D11 final** — Pitch deck final + dry-run 3x (1 em hotspot 4G)
19. Polish + buffer

### Bloco 5 — 01-02/06
20. Deploy final Vercel + smoke E2E
21. Pitch presencial 02/06 11h

---

## 5. Decisões aplicáveis HOJE sem dependência externa

Itens que orquestrador pode aplicar agora no código (sem esperar credencial Woovi, leitura de edital, anchor build, etc.):

- **D3** (reason map) ✅
- **D6 parcial** (.env.example, boot-check, CORS, nonce atomic, income clamp, pixKey CPF, search_path RPC) ✅
- **D8** (remover badges UI) ✅
- **D9-b** (já está em [1,5,10] após mudança anterior) ✅
- **D2 parcial** (deletar `ALWAYS_APPROVE`, substituir imports de mocks por reais, guard `approved`, banner DEMO MODE quando `!HAS_BACKEND`) ✅
- **NOVO-1** (`installments` em compute-score) ✅
- **D10 parcial** (`MAX_AMOUNT_USDC` 100→10 em `lib.rs`) ✅
- **D12 parcial** (estrutura `VITE_SOLANA_RPC` com fallback no `WalletProvider`) ✅

NÃO aplicáveis agora (precisam ação externa):
- **D7** (Samuel grava vídeo)
- **D1** (Samuel lê edital)
- **D5** (depende cred Woovi)
- **D10 completo** (Samuel instala Anchor CLI, deploya)
- **D11** (Samuel/Josi/Lídia fazem deck)
- **D13** (Samuel escreve Q&A)

---

**Assinado:** squad de 10 agentes, Fase 2 votação 26/05/2026.
**Próximo passo orquestrador:** aplicar Bloco 1 / Seção 5 dos itens autorizados.
