-- DR-001 D6: hardening de schema e RPC.
-- (1) search_path explícito na RPC SECURITY DEFINER (anti privilege escalation via schemas).
-- (2) UNIQUE em payouts (loan_id, kind) WHERE status != 'failed' — anti double-payout
--     mesmo em race condition entre SELECT+INSERT da request-payout edge fn.
-- (3) RLS deny-all explícito em score_snapshots (estava habilitada sem policy, intent implícito).
-- (4) Índice em payouts.status pra polling.

ALTER FUNCTION create_loan_request_with_snapshot(
  UUID, UUID, NUMERIC, loan_reason, loan_request_status, INT, NUMERIC, NUMERIC, JSONB
) SET search_path = public, pg_temp;

CREATE UNIQUE INDEX idx_payouts_active_per_loan_kind
  ON payouts (loan_id, kind)
  WHERE status <> 'failed';

CREATE POLICY score_snapshots_no_client_access ON score_snapshots
  FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX idx_payouts_status ON payouts (status);
