-- Uber Money — initial schema
-- Decisions: JWT sub = UUID v5(wallet, NAMESPACE); loans without user_id (derive via request);
-- NUMERIC(10,2) for BRL; nonce auditável via used_at; UUID namespace por env; webhook secret no Vault.

CREATE TYPE document_kind       AS ENUM ('print_earnings', 'cnh');
CREATE TYPE loan_reason         AS ENUM ('emergency', 'vehicle_repair', 'fuel', 'other');
CREATE TYPE loan_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE loan_status         AS ENUM ('open', 'paid', 'late');
CREATE TYPE payout_kind         AS ENUM ('release', 'repay');
CREATE TYPE payout_status       AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE pix_key_type        AS ENUM ('cpf', 'email', 'phone', 'evp');

CREATE TABLE users (
  id         UUID PRIMARY KEY,
  wallet     TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nonces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet     TEXT NOT NULL,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at    TIMESTAMPTZ
);
CREATE INDEX idx_nonces_wallet_value ON nonces (wallet, value);
CREATE INDEX idx_nonces_created_at   ON nonces (created_at);

CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind        document_kind NOT NULL,
  storage_url TEXT NOT NULL,
  ocr_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_user_id ON documents (user_id);
CREATE UNIQUE INDEX idx_documents_user_kind ON documents (user_id, kind);

CREATE TABLE loan_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_brl   NUMERIC(10,2) NOT NULL CHECK (amount_brl > 0),
  reason       loan_reason NOT NULL,
  status       loan_request_status NOT NULL DEFAULT 'pending',
  score        INT CHECK (score BETWEEN 0 AND 1000),
  limit_brl    NUMERIC(10,2) NOT NULL DEFAULT 0,
  interest_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loan_requests_user_id ON loan_requests (user_id);
CREATE INDEX idx_loan_requests_status  ON loan_requests (status);

CREATE TABLE loans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL UNIQUE REFERENCES loan_requests(id) ON DELETE RESTRICT,
  principal_brl NUMERIC(10,2) NOT NULL CHECK (principal_brl > 0),
  interest_pct  NUMERIC(5,4) NOT NULL,
  due_date      DATE NOT NULL CHECK (due_date > CURRENT_DATE),
  status        loan_status NOT NULL DEFAULT 'open',
  tx_release    TEXT,
  on_chain_pda  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loans_request_id ON loans (request_id);
CREATE INDEX idx_loans_status     ON loans (status);

CREATE TABLE payouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id               UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
  kind                  payout_kind NOT NULL,
  amount_brl            NUMERIC(10,2) NOT NULL CHECK (amount_brl > 0),
  pix_key               TEXT NOT NULL,
  pix_key_type          pix_key_type NOT NULL,
  status                payout_status NOT NULL DEFAULT 'pending',
  woovi_correlation_id  TEXT NOT NULL UNIQUE,
  woovi_payload         JSONB,
  endtoend_id           TEXT,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payouts_loan_id              ON payouts (loan_id);
CREATE INDEX idx_payouts_woovi_correlation_id ON payouts (woovi_correlation_id);

CREATE TABLE score_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES loan_requests(id) ON DELETE RESTRICT,
  inputs      JSONB NOT NULL,
  score       INT NOT NULL CHECK (score BETWEEN 0 AND 1000),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_score_snapshots_request_id ON score_snapshots (request_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_loan_requests_updated_at BEFORE UPDATE ON loan_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_loans_updated_at         BEFORE UPDATE ON loans         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payouts_updated_at       BEFORE UPDATE ON payouts       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own         ON users         FOR SELECT USING (id = auth.uid());
CREATE POLICY documents_select_own     ON documents     FOR SELECT USING (user_id = auth.uid());
CREATE POLICY loan_requests_select_own ON loan_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY loans_select_own         ON loans         FOR SELECT USING (request_id IN (SELECT id FROM loan_requests WHERE user_id = auth.uid()));
CREATE POLICY payouts_select_own       ON payouts       FOR SELECT USING (loan_id IN (SELECT l.id FROM loans l JOIN loan_requests lr ON l.request_id = lr.id WHERE lr.user_id = auth.uid()));

-- Atomic loan_request + score_snapshot
CREATE OR REPLACE FUNCTION create_loan_request_with_snapshot(
  p_id UUID, p_user_id UUID, p_amount_brl NUMERIC, p_reason loan_reason,
  p_status loan_request_status, p_score INT, p_limit_brl NUMERIC, p_interest_pct NUMERIC, p_inputs JSONB
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO loan_requests (id, user_id, amount_brl, reason, status, score, limit_brl, interest_pct)
  VALUES (p_id, p_user_id, p_amount_brl, p_reason, p_status, p_score, p_limit_brl, p_interest_pct);
  INSERT INTO score_snapshots (request_id, inputs, score) VALUES (p_id, p_inputs, p_score);
END;
$$;
