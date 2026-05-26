# CRE Workflow — Uber Money

Workflow Chainlink CRE que recebe inputs (wallet Solana, URL print de ganhos, URL CNH),
chama a edge function `compute-score` no Supabase via consensus median, e entrega o
resultado (`limitUsdcMicro`) ao programa Anchor em Solana via **CCIP v1.6**.

## Arquitetura
```
HTTPTrigger
  → CRE Workflow (TS, WASM)
    → fetchScore (consensus median, chama /compute-score)
    → report (ECDSA)
    → writeReport(EVM Sender @ Sepolia)
        → ccipSend(SVMExtraArgsV1) → Anchor program @ Solana devnet
                                       → release_loan(score, amount)
```

## Setup local
```bash
npm install -g @chainlink/cre-cli
cre auth login
cre workflow simulate --config config.json
```

## Refs
- https://docs.chain.link/cre
- https://docs.chain.link/cre/reference/sdk/core-ts
- https://docs.chain.link/ccip/tutorials/svm/receivers
- https://github.com/smartcontractkit/solana-starter-kit
- https://github.com/smartcontractkit/cre-templates

## Status
🚧 Stub. Sender EVM ainda não deployado; Anchor receiver ainda não escrito (CCIP receive instruction). Bloqueante p/ track Chainlink — ver `.sdd/uber-money/03-tasks.md`.
