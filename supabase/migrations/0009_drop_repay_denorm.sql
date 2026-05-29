-- 0009_drop_repay_denorm.sql — DR-007 followup: remove denormalization
--
-- Rationale: Two sources of truth = drift guaranteed.
-- • loans.repaid_at derivable from updated_at when status='paid' + tx_repay (already implies paid).
-- • payouts.loan_pda_address derivable from deterministic PDA: findProgramAddressSync(['loan', cpf_hash]).
--   Already have loans.on_chain_pda; calculate on-the-fly in edge functions instead.

ALTER TABLE loans DROP COLUMN IF EXISTS repaid_at;
ALTER TABLE payouts DROP COLUMN IF EXISTS loan_pda_address;
