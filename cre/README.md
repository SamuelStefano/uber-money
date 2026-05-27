# CRE Workflow — Uber Money

Workflow Chainlink CRE que recebe inputs do motorista (wallet, renda, valor pedido)
e devolve a decisão de crédito (aprovado/rejeitado, score, limite, juros).

## Arquitetura
```
HTTPTrigger payload { wallet, monthlyIncomeBRL, requestedAmountBRL }
  → score-workflow (TypeScript, compila pra WASM)
    → valida input (zod)
    → computeScore(income, requested, config) → Decision
    → runtime.log decision
    → retorna JSON.stringify(decision)
```

## Setup
```bash
# CLI já instalado em ~/.cre/bin/cre  (curl -sSL https://app.chain.link/cre/install.sh | bash)
# Bun em ~/.bun/bin/bun                (curl -fsSL https://bun.sh/install | bash)
cd cre/score-workflow && bun install
```

## Compilar workflow → WASM
```bash
cd cre && cre workflow build ./score-workflow
# → ./score-workflow/binary.wasm + hash
```

## Simular (precisa CRE_API_KEY)
```bash
export CRE_API_KEY=<chave-em-app.chain.link>
cd cre && cre workflow simulate ./score-workflow \
  --http-payload '{"wallet":"abc","monthlyIncomeBRL":4250,"requestedAmountBRL":5}'
```

## Status
- ✅ Workflow compila pra WASM com sucesso (cre workflow build)
- ⏳ Simulação aguarda CRE_API_KEY do Samuel
- ⏳ Deploy CRE network (opcional — simulate basta pro track)

## Refs
- https://docs.chain.link/cre
- https://github.com/smartcontractkit/cre-templates
- https://github.com/smartcontractkit/cre-sdk-typescript
