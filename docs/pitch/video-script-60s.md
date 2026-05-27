# Vídeo 60s — Uber Money (Hackanation 2026)

**Formato:** 9:16 vertical (mobile-first), 1080×1920. Submissão Taikai + IG/X.
**Voice-over:** PT-BR neutro, Samuel grava no celular ou usa ElevenLabs (clone voz).
**Trilha:** lo-fi minimal, picos nos beats 30s e 45s (Pix bipando).

---

## Storyboard (5 beats × ~12s)

### 0–5s · HOOK PROBLEMA
**Visual:** câmera no acostamento, motorista olhando pneu furado, celular `bateria 5%`, notificação "passageiro cancelou corrida".
**Voice-over:** "Pneu furou. Sem dinheiro. Sem SPC limpo. Banco não atende em 30 segundos. E o passageiro tá cancelando."
**Texto na tela:** `9 milhões de motoristas. R$50 que faltam pra rodar.`

### 5–15s · SOLUÇÃO EM 1 FRASE
**Visual:** logo Uber Money zooming in, slogan abaixo. Pills coloridos: SOLANA · CHAINLINK · WOOVI · PIX.
**Voice-over:** "Uber Money: empréstimo em segundos com score on-chain, juros baixos, sem consulta ao SPC."
**Texto na tela:** `Crédito na hora, pra quem roda.`

### 15–30s · LIVE DEMO (login + score)
**Visual:** mockup mobile real — usa screen-record do http://178.156.191.231:5173 ou Vercel preview.
- 15-18s: tela login → "Conectar wallet" → Phantom popup → assinatura
- 18-22s: tela upload → CNH + print Uber subindo (skeleton loading)
- 22-26s: tela request → slider R$1 → chip "Pneu" → botão "Pedir agora"
- 26-30s: tela analysis → splash "Analisando via Chainlink CRE…" → "Score 720/1000" + "R$ 1,00 aprovado"
**Voice-over:** "Conecta a Phantom. Sobe o print dos seus ganhos. A IA do score, **processada via Chainlink CRE**, te avalia em segundos."

### 30–45s · ON-CHAIN + PIX BIPA (efeito UAU)
**Visual:**
- 30-33s: botão "Efetuar empréstimo" → animação USDC caindo na Phantom (extension popup mostra +0.20 USDC)
- 33-37s: pill verde aparece "**On-chain ✓**" + link Explorer Solana (zoom no tx hash real)
- 37-40s: motorista clica "Sacar como Pix"
- 40-45s: **celular do jurado/Samuel bipa Pix recebido R$ 1,00** (overlay notification banco)
**Voice-over:** "USDC cai na sua Phantom — assina **on-chain Solana**. Toca em Sacar como Pix. E o dinheiro tá no seu banco. **Esse Pix é real.**"
**Texto na tela:** `tx Solana: 2TyJsk...vB9j` (tx hash do smoke real)

### 45–60s · STACK CLOSING
**Visual:** dashboard "Meu impacto" + 4 selos sponsor (Solana / Chainlink / Woovi / DFL). Logo final + URL Taikai.
**Voice-over:** "Score off-chain via **Chainlink CRE**, escrow on-chain **Anchor + Solana**, off-ramp **Woovi**. Crédito produtivo sem garantia, na velocidade do Brasil."
**Texto na tela:** `Hackanation 2026 · TokenNation` + `taikai.network/.../Hackanation2026`

---

## Plano B vídeo (se demo travar ao vivo no pitch)

Se Vercel/RPC cair no Bienal, usar **pré-gravado** com os passos 30-45s. Plano v9 Q14 prevê isso.

**Trecho fallback** (15s, 30-45s só):
- Pre-grava com **tx real** já confirmada (`2TyJskPWqYy...vB9j` do smoke)
- Pre-grava Pix mock confirmado em 8s
- Mostra dramatização do dinheiro caindo no banco

## Storyboard frames (placeholder Figma/Miro)

```
[0:00] [0:05] [0:15] [0:30] [0:45] [0:60]
  ▼      ▼      ▼      ▼      ▼      ▼
HOOK   LOGO   DEMO   PIX!   STACK   END
pneu   pills  flow   bipa   selos   url
```

## Critérios de aprovação pré-edit

- [ ] Pix real bipando em 35-40s (não montagem)
- [ ] Tx hash REAL na tela (não placeholder)
- [ ] Logo + 4 selos sponsor visíveis em closing
- [ ] Duração 58-62s (1s margem)
- [ ] Voice-over com confiança, não corrido
- [ ] Sem termos "criptomoeda" / "DeFi" pesados — "empréstimo on-chain", "score Chainlink", "Pix"

## Assets necessários
- Logo Uber Money SVG (high-res)
- Selos sponsor (Solana, Chainlink, Woovi, DFL)
- Trilha lo-fi (royalty-free: epidemicsound, artlist)
- Tx hashes reais (já gravados):
  - Deploy: `SXGHAapoVN8...c88jyPK`
  - Smoke release_loan: `2TyJskPWqYy...vB9j`
  - Smoke admin_disburse: `3jY9w3GLMHg...FeYiu`

## Ferramentas
- Gravação: celular (Pixel/iPhone) ou OBS na VPS
- Edição: CapCut (mobile) ou DaVinci Resolve (desktop, free)
- Voice-over: gravado direto no celular OU ElevenLabs clone (~5min)
