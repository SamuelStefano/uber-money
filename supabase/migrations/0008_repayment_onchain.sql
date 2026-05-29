-- 0008_repayment_onchain.sql — DR-007 cycle close
--
-- D6: Reusar payouts table com kind='repay' (já existe em ENUM).
-- D7: Adicionar campos pra Ed25519 RepayAttestation (woovi-webhook gera, front re-assina).
-- D9: tx_repay UNIQUE partial anti-replay; endtoend_id UNIQUE pra repay (Pix dedupe).
-- D11: RLS UPDATE deny em loans — só backend service-role pode marcar paid.
--
-- Schema expansões:
--   loans: tx_repay, repaid_at (denorm timestamp audit)
--   payouts: attestation_payload (Ed25519 RepayAttestation {signatureHex, messageHex, nonceHex, expiresAt}),
--            loan_pda_address (cross-chain auditoria)

ALTER TABLE loans
  ADD COLUMN tx_repay TEXT,
  ADD COLUMN repaid_at TIMESTAMPTZ;

ALTER TABLE payouts
  ADD COLUMN attestation_payload JSONB,
  ADD COLUMN loan_pda_address TEXT;

-- D9: UNIQUE partial em loans.tx_repay (anti-replay tx onchain).
-- Null allowed: tx_repay preenchido só após confirm-repayment validar getTransaction().
CREATE UNIQUE INDEX idx_loans_tx_repay_unique
  ON loans (tx_repay)
  WHERE tx_repay IS NOT NULL;

-- D9: UNIQUE partial em payouts.endtoend_id quando kind='repay' (Pix dedupe).
-- Null allowed: endtoend_id preenchido pelo woovi-webhook. Só repay precisa dedupe
-- por lei Bacen; release já tem idx_payouts_active_per_loan_kind cobrindo.
CREATE UNIQUE INDEX idx_payouts_repay_endtoend_unique
  ON payouts (endtoend_id)
  WHERE kind = 'repay' AND endtoend_id IS NOT NULL;

-- D11: RLS UPDATE bloqueado pra client role. Service-role bypassa RLS (needed por confirm-repayment edge fn).
-- Implícito: SELECT segue policies loan_select_own (0001.sql).
CREATE POLICY loans_no_client_update ON loans
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Audit comments (legível pra futuro migrante).
COMMENT ON COLUMN loans.tx_repay IS
  'Tx hash da Anchor repay_loan ix. UNIQUE = anti-replay. NULL até confirm-repayment validar onchain + discriminator check.';

COMMENT ON COLUMN loans.repaid_at IS
  'Timestamp denormalizado da Anchor repay_loan (D7). Auditoria: deve == loan_pda.repaid_at onchain (cross-chain verify).';

COMMENT ON COLUMN payouts.attestation_payload IS
  'Ed25519 RepayAttestation {signatureHex, messageHex, nonceHex, expiresAt}. Gerada por woovi-webhook pós-Pix; front re-assina tx Anchor repay_loan. Shape: 128 bytes = b"REPAY_V1"(8) || cpf_hash(32) || loan_pda(32) || borrower(32) || amount_paid_usdc LE(8) || nonce(8) || expires_at LE(8).';

COMMENT ON COLUMN payouts.loan_pda_address IS
  'Loan PDA base58 derivado [loan, cpf_hash]. Referência cruzada DB↔chain pra auditoria. Set por woovi-webhook.';
