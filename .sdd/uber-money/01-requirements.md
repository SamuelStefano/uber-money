# Requirements — Uber Money

## Visão (1 linha)
Web app 100% web onde motorista Uber conecta carteira Solana, pede crédito pequeno, score off-chain aprova na hora e **Pix cai na conta em segundos**.

## User stories (MVP)
1. Como motorista, eu **conecto minha carteira Phantom** e entro no app sem criar conta.
2. Eu vejo meu **saldo, score e limite**.
3. Eu peço um valor (R$ 100–500), informo motivo + dados de renda, e recebo **decisão em segundos**.
4. Se aprovado, eu **clico "Receber via Pix"** e o dinheiro cai na minha conta.
5. Eu vejo o **comprovante on-chain** (Solana explorer).

## Não-funcional
- 100% web responsivo (sem app nativo).
- Auth: SÓ wallet (Phantom externa via @solana/wallet-adapter). Sem Google/Uber/social.
- Dados sensíveis (URL print, URL CNH, dados do user) **OFF-CHAIN** no Supabase (LGPD).
- Stablecoin: **USDC devnet** (Solana).
- Off-ramp: **Woovi sandbox** (sub-conta).
- Track Chainlink: **workflow CRE** + CCIP v1.6 → Solana (exigência do prêmio).
- Limite hard de payout por tx: R$ 10 sandbox.
- Plano-B: **vídeo gravado** do fluxo completo pra demo presencial.

## Fora do MVP (v2)
- Repayment automático com juros on-chain.
- Marketplace de saques.
- KYC real (CNH validation, biometria).
- Mainnet.
- Mobile nativo.

## Definição de pronto
- Frontend: 5 telas navegáveis ponta a ponta com dados mockados.
- Conexão Phantom funciona em devnet.
- Edge function `compute-score` retorna decisão.
- Edge function `request-payout` chama Woovi sandbox e dispara Pix.
- Programa Anchor `release_loan` deployado em devnet (vault iniciado, transfer funciona).
- CRE workflow simulado (preferencialmente com 1 entrega real CCIP→Solana).
- Vídeo de 60s do fluxo completo gravado.
