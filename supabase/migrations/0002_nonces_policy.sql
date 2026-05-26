-- Nonces are server-only (consumed by wallet-auth edge fn via service_role).
-- Service role bypasses RLS; explicit policy keeps the schema audit-friendly
-- and ensures NO direct client access from authenticated tokens.
CREATE POLICY nonces_no_client_access ON nonces
  FOR ALL USING (false) WITH CHECK (false);
