-- Mata replay/double-pay no cash-out (squad CRIT-1): uma tx Solana só pode
-- virar Pix uma vez, e cada loan só pode ser sacado uma vez. Backstop no DB;
-- a edge ainda faz o pre-check pra responder 409 amigável.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashout_intents_sig_consumed
  ON cashout_intents (source, solana_signature)
  WHERE status <> 'failed' AND solana_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashout_intents_loan_active
  ON cashout_intents (loan_id)
  WHERE status <> 'failed' AND loan_id IS NOT NULL;
