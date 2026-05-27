-- DR-003 D3 prep (schema-only — código de USDC return adiado pra 28/05).
-- v9 Q22 + Q29: edge `usdc-to-pix` compartilhada (Uber Money + Chain Oil).
-- Squad consensus 27/05 ~15h: implementar APENAS schema agora, código vira amanhã sob flag.
--
-- Strategy:
--   - cashout_intents: 1 row por intent de saque (idempotência via client_intent_id)
--   - source: 'uber_money' | 'chain_oil' (Q29 reuso deliberado)
--   - status: máquina de estados pra saga USDC return + Pix
--   - solana_signature: tx hash da assinatura motorista→tesouraria (Step 2a)
--   - pix_payout_id: liga ao woovi_correlation_id após Step 2b
--   - RLS: service-role only (clientes via JWT só inserem via edge)

CREATE TYPE cashout_source AS ENUM ('uber_money', 'chain_oil');
CREATE TYPE cashout_status AS ENUM (
  'pending_signature',   -- aguarda motorista assinar tx Phantom USDC→tesouraria
  'usdc_received',       -- tx Solana confirmada, vault recebeu USDC de volta
  'pix_dispatched',      -- chamou Woovi, aguarda webhook
  'pix_confirmed',       -- Pix bateu na conta do motorista
  'pix_failed_refund_due', -- Woovi falhou; USDC fica pro refund manual
  'failed'               -- erro genérico (pré-flight Woovi, validação on-chain)
);

CREATE TABLE cashout_intents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source              cashout_source NOT NULL,
  client_intent_id    UUID NOT NULL,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  loan_id             UUID REFERENCES loans(id) ON DELETE RESTRICT, -- nullable: chain_oil não tem loan
  amount_usdc         BIGINT NOT NULL CHECK (amount_usdc > 0),
  amount_brl          NUMERIC(10,2) NOT NULL CHECK (amount_brl > 0),
  pix_key             TEXT NOT NULL,
  pix_key_type        pix_key_type NOT NULL,
  solana_signature    TEXT, -- preenchido em Step 2a (USDC user→tesouraria)
  pix_payout_id       UUID REFERENCES payouts(id) ON DELETE RESTRICT, -- liga ao Woovi
  status              cashout_status NOT NULL DEFAULT 'pending_signature',
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotência: 1 row por (source, client_intent_id) — front gera UUID por sessão
CREATE UNIQUE INDEX idx_cashout_intents_source_client
  ON cashout_intents (source, client_intent_id);

-- Hot path lookups
CREATE INDEX idx_cashout_intents_user ON cashout_intents (user_id);
CREATE INDEX idx_cashout_intents_status ON cashout_intents (status);
CREATE INDEX idx_cashout_intents_loan ON cashout_intents (loan_id) WHERE loan_id IS NOT NULL;

-- RLS: service-role only (clientes via JWT acessam só via edge fn com SERVICE_ROLE_KEY)
ALTER TABLE cashout_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY cashout_intents_no_client_access
  ON cashout_intents FOR ALL USING (false) WITH CHECK (false);

-- Trigger pra updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cashout_intents_updated_at ON cashout_intents;
CREATE TRIGGER trg_cashout_intents_updated_at
  BEFORE UPDATE ON cashout_intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE cashout_intents IS
  'Saga state pra USDC return + Pix off-ramp. DR-003 D3, v9 Q22+Q29 compartilhada Uber Money/Chain Oil.';
COMMENT ON COLUMN cashout_intents.solana_signature IS
  'Tx Solana: motorista assina spl-token transfer USDC user_ata→treasury_ata. Edge valida via getParsedTransaction antes de Woovi.';
COMMENT ON COLUMN cashout_intents.client_intent_id IS
  'UUID gerado no frontend (1 por sessão de saque) — anti double-click via UNIQUE constraint.';
