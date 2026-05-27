-- DR-002 D6: cpf_hash on-chain (Q5 TL) + pepper per-user (squad amend A2/A3/A4/A6).
-- Strategy:
--   (1) users.cpf_pepper bytea per-user, gerado random no INSERT (defense in depth)
--   (2) loan_requests.cpf_hash bytea = sha256(cpf || cpf_pepper) computado pela edge admin
--   (3) loans.cpf_hash bytea UNIQUE = anti-duplo off-chain (dupla camada com PDA on-chain)
--   (4) BTREE index pra lookup hot path
--   (5) RLS já é deny-all via 0004; estas colunas herdam.

ALTER TABLE users
  ADD COLUMN cpf_pepper bytea NOT NULL DEFAULT gen_random_bytes(32);

ALTER TABLE loan_requests
  ADD COLUMN cpf_hash bytea;

ALTER TABLE loans
  ADD COLUMN cpf_hash bytea;

-- Backfill nullable temporariamente; após primeira release_loan, edge passa a popular.
-- UNIQUE só em loans (anti-duplo "1 loan por CPF lifetime"):
ALTER TABLE loans
  ADD CONSTRAINT loans_cpf_hash_unique UNIQUE (cpf_hash);

CREATE INDEX idx_loan_requests_cpf_hash ON loan_requests USING btree (cpf_hash);
CREATE INDEX idx_loans_cpf_hash         ON loans         USING btree (cpf_hash);

COMMENT ON COLUMN users.cpf_pepper IS
  'Pepper per-user (32B random) pra sha256(cpf || cpf_pepper). DR-002 D1.';
COMMENT ON COLUMN loan_requests.cpf_hash IS
  'sha256(cpf || users.cpf_pepper). Pseudonimização LGPD art.13 §4º.';
COMMENT ON COLUMN loans.cpf_hash IS
  'Mesmo hash do request; UNIQUE = anti-duplo dupla camada com PDA on-chain.';
