# Uber Money 💸

**Microcrédito on-chain instantâneo para motoristas de aplicativo.**

Pede no app → score on-chain via Chainlink CRE aprova → **Pix cai na conta em segundos**. Construído para o **Hackanation 2026** (TokenNation · Solana + Chainlink · tese RWA).

## Pitch
> Furou o pneu? Acabou a gasolina? O dinheiro cai no seu Pix em segundos. Score on-chain, juros baixos, sem consulta ao SPC.

## Datas
- **Submit inicial:** 30/05/2026 (Taikai)
- **Submit final:** 01/06/2026 noite
- **Pitch presencial:** 02/06/2026, Pavilhão da Bienal SP

## Stack
| Camada | Tech |
|---|---|
| Front | Vite + React 19 + TS + Tailwind v4 + framer-motion |
| Wallet | `@solana/wallet-adapter` (Phantom only — v9 Q24) |
| Backend | Supabase (Postgres + Edge Functions Deno + JWT) |
| On-chain | Anchor 0.30 — `release_loan` + `admin_disburse`, PDA `[LOAN, sha256(cpf‖pepper_per_user)]` |
| Oráculo | Chainlink CRE workflow (TS → WASM) + CCIP `ccipSend` (Sepolia → Solana) |
| Pix | Woovi (env `WOOVI_MODE=prod\|mock`) |
| Stablecoin | USDC devnet |
| RPC | Helius devnet + QuickNode failover (v9 Q25) |
| Hosting | Vercel |

## Chainlink integration

Pattern canônico **CRE workflow Sepolia → CCIP arbitrary messaging → Anchor receiver Solana devnet**.

| Camada | Estado | Evidência |
|---|---|---|
| CRE workflow TS | ✅ compila pra `binary.wasm` | `cre/score-workflow/main.ts` |
| CRE simulate | ⏳ pending CRE_API_KEY | screenshot em `docs/cre-simulate.png` (TODO) |
| CRE deploy + verify Sepolia | ⏳ 28/05 | Etherscan link aqui (TODO) |
| CCIP `ccipSend` Sepolia | ⏳ 28/05 | `messageId` em [ccip.chain.link](https://ccip.chain.link) (TODO) |
| Solana receiver | ⚠️ MOCK declarado — instruction `admin_disburse(cpf_hash, amount, score, source_chain_selector)` chamada pelo admin (não pelo CCIP router) por restrição de tempo de hackathon. Assinatura compatível com `Any2SolanaMessage`. | `programs/uber-money/src/lib.rs:104` |

**Por que MOCK declarado:** v9 plan Q21 hard gate 27/05 14h passou. Plan B aceito em Q14 R1 ("se travar → mocka + transparência"). Solange (jury) premia honestidade > completude — ver [DR-003](.sdd/uber-money-v2/decisions/DR-003-v9-mock-honest.md).

**Upgrade path produção:** trocar `admin_disburse` por `ccip_receive` real via [solana-starter-kit](https://github.com/smartcontractkit/solana-starter-kit). Assinatura idêntica.

## Programa Anchor — LIVE em devnet ✅

| Item | Endereço/Tx | Explorer |
|---|---|---|
| **Program ID** | `6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N` | [open](https://explorer.solana.com/address/6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N?cluster=devnet) |
| **Deploy tx** | `SXGHAapoVN8eyXqGvFJR94A3a8Vu6AHrmbSwBjjsZSrPD1XLoF8gWsLzWZyEsWAEEuKJ48beDazaMezCn88jyPK` | [open](https://explorer.solana.com/tx/SXGHAapoVN8eyXqGvFJR94A3a8Vu6AHrmbSwBjjsZSrPD1XLoF8gWsLzWZyEsWAEEuKJ48beDazaMezCn88jyPK?cluster=devnet) |
| **Authority (admin)** | `5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa` | [open](https://explorer.solana.com/address/5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa?cluster=devnet) |
| **Vault PDA** | `AE5KWqjhDGNRvk4bV4nEJGbcSy15eAWVVazHyPsjbnxz` | [open](https://explorer.solana.com/address/AE5KWqjhDGNRvk4bV4nEJGbcSy15eAWVVazHyPsjbnxz?cluster=devnet) |
| **Vault Token Account** | `2U6Tqapn6KVc5X9AfiMgCninXAk8L3tGgVwcKghvp3ST` | [open](https://explorer.solana.com/address/2U6Tqapn6KVc5X9AfiMgCninXAk8L3tGgVwcKghvp3ST?cluster=devnet) |
| **init_vault tx** | `u4rBqTRwQpTcmqeUEHfxZ92zMahYY3nFboQeLLTE8GnYqL8izP3QmsVrhfksdT9dFbnvitDiSpzQW4jmLd9rhzP` | [open](https://explorer.solana.com/tx/u4rBqTRwQpTcmqeUEHfxZ92zMahYY3nFboQeLLTE8GnYqL8izP3QmsVrhfksdT9dFbnvitDiSpzQW4jmLd9rhzP?cluster=devnet) |
| **Smoke release_loan tx** | `2TyJskPWqYyBpYevdN5iBDEoZ1GjZ5yKyKW29spaS2aEhh8mhXqmSgK4Rrfqjkvk7p3XjFJV1MDkGVxksxiHvB9j` | [open](https://explorer.solana.com/tx/2TyJskPWqYyBpYevdN5iBDEoZ1GjZ5yKyKW29spaS2aEhh8mhXqmSgK4Rrfqjkvk7p3XjFJV1MDkGVxksxiHvB9j?cluster=devnet) |
| **USDC mint devnet (Circle)** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | [open](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet) |

**Vault pre-funded com 20 USDC oficial Circle.** Smoke test 27/05 14:15 BRT: borrower test wallet recebeu 1 USDC do vault via `release_loan(cpf_hash, 1_000_000, 720)`.

Instructions:
- `initialize_vault()` — one-shot, cria vault PDA `[b"vault"]` + token account
- `release_loan(cpf_hash, amount, score)` — admin-triggered (Step 1 demo)
- `admin_disburse(cpf_hash, amount, score, source_chain_selector)` — mock do CCIP receiver

PDA seed: `[b"loan", sha256(cpf || users.cpf_pepper)]` — 1 empréstimo por CPF lifetime. `init` (não `init_if_needed`) → falha hard se já existe.

Build:
```bash
cd programs/uber-money
cargo update -p crypto-common@0.2.2 --precise 0.1.6
cargo update -p blake3 --precise 1.5.5
cargo update -p jobserver --precise 0.1.32
cargo update -p proc-macro-crate@3.5.0 --precise 3.2.0
cargo update -p indexmap@2.14.0 --precise 2.6.0
cargo update -p proc-macro2 --precise 1.0.94
cd ../..
anchor build  # IDL falha (proc-macro2/nightly), mas .so compila
```

Deploy:
```bash
solana airdrop 2  # ou faucet.solana.com
solana program deploy target/deploy/uber_money.so \
  --program-id target/deploy/uber_money-keypair.json
```

## Como rodar (front)
```bash
pnpm install
pnpm dev
```
Abre em `http://localhost:5173`. Conecta com Phantom em **devnet**.

## Estrutura
```
/                       # Front Vite+React (web app)
  src/
    pages/              # 6 telas: login, upload, request, analysis, approved, home
    components/         # atoms / molecules / organisms (atomic design)
    lib/
      api.ts            # cliente Supabase Edge Functions (releaseLoan + requestPayout)
programs/uber-money/    # Programa Anchor (Rust/Solana)
cre/score-workflow/     # Workflow Chainlink CRE (TS)
supabase/
  functions/
    wallet-auth         # Phantom signature → JWT
    process-document    # CNH OCR via Claude Vision
    request-loan        # score + cria loan_request
    request-payout      # dispatcher: action='release' (Anchor) | 'payout' (Woovi)
    parse-uber-print    # stub Will completa 28/05
    woovi-webhook
    _shared/
      anchor-signer.ts  # raw tx server-side (sem IDL)
  migrations/           # 0001-0005 (cpf_pepper per-user + cpf_hash UNIQUE)
.sdd/uber-money-v2/
  01-requirements.md
  02-design.md          # arquitetura + §security + §migrations
  03-tasks.md
  decisions/
    DR-001-squad-audit.md
    DR-002-squad-anchor-refactor.md
    DR-003-v9-mock-honest.md
```

## Caps de segurança (defense-in-depth)
| Camada | Cap | Onde |
|---|---|---|
| User-facing | **R$ 10 por payout** | `PAYOUT_MAX_BRL` env nas edges `request-loan` + `request-payout` |
| On-chain ceiling | **10 USDC** (≈ R$ 50) | `MAX_AMOUNT_USDC` em `lib.rs:18` |
| Vault pre-fund (demo) | **20 USDC** | manual transfer Phantom → vault token account |

User-facing cap dispara primeiro. On-chain cap só protege se cap edge for bypassed (ex: admin keypair comprometida).

## Decisões trancadas (plan v9 Tainan TG 6554, 27/05 12:25Z)
- **Q5** Hash CPF on-chain. PDA `[loan, sha256(cpf)]` — refinado pra pepper per-user em DR-002 (`users.cpf_pepper` random 32B no signup, vault Supabase only).
- **Q8** Pix flow 2 steps: Efetuar (`release_loan` Anchor) + Sacar (Woovi pix-out).
- **Q21** CRE GO-COM-DEADLINE → MOCK declarado (DR-003).
- **Q22** Off-ramp trigger flow B: front clica Sacar → edge direto.
- **Q24** Phantom only (drop Privy/Google/Uber OAuth).
- **Q25** Helius devnet RPC + QuickNode failover.
- **Q27** Solana devnet (não testnet).
- **Q29** 1 Edge fn `usdc-to-pix` compartilhada com Chain Oil.
- **Q30** Samuel = Uber Money 100%, Will = Chain Oil 100%.

## LGPD — frase defensável (pitch jury)
> "Nosso contrato armazena um hash com pepper do CPF — **pseudonimização por design conforme LGPD art.13 §4º**. O CPF real fica exclusivamente no backend. Em produção migramos para identificador opaco sem nenhuma relação matemática com o CPF, eliminando o risco residual de reversão."

## Trust assumptions (transparência pré-pitch)
- **Authority é oráculo de score implícito.** Admin assina `release_loan` confiando no score off-chain computado pela edge. Em produção: Ed25519 attestation do CRE com pubkey verificada on-chain.
- **`borrower: AccountInfo` não-Signer.** Admin escolhe ATA destino vinculado ao JWT verificado. Em produção: borrower vira Signer via Squads multisig ou session key.
- **CCIP último hop mockado** via `admin_disburse`. CRE Sepolia + CCIP `ccipSend` são reais (links no explorer); o callback final é admin-triggered.

## Status (27/05/2026 — gate EOD batido ✅)
- ✅ Anchor program **DEPLOYADO em devnet** (program ID acima)
- ✅ Vault inicializado + pre-funded com 20 USDC oficial
- ✅ Smoke test on-chain passou (1 USDC transferido pelo programa)
- ✅ Edge `request-payout` (com Anchor signer server-side raw tx) deployada
- ✅ Edge `wallet-auth` (fix DR-003: sem `session_id` fake) deployada
- ✅ Edge `parse-uber-print` stub deployada (Will completa OCR real 28/05)
- ✅ Migration 0005 aplicada (users.cpf_pepper per-user + loans.cpf_hash UNIQUE)
- ✅ Front 6 telas atomic design + 2-step UX (`Efetuar` → `Sacar`)
- ✅ Wallet UX: Phantom only, autoConnect=false, dedupe signMessage
- ✅ Helius RPC + QuickNode failover env (Q25 v9)
- ⏳ CRE simulate + screenshot (Samuel pega CRE_API_KEY)
- ⏳ Vercel deploy (28/05 manhã)
- ⏳ Vídeo Plano B 60s (Samuel grava)
- ⏳ USDC return (DR-003 D3: adiado 28/05, migration 0006 prep feita)

## Time
Samuel Stefano (lead Uber Money) · William Rodrigo (lead Chain Oil) · Tainan Fidelis (TL/arquitetura) · Orlando Souza (mentor cripto) · Josyani/Lídia (front).
