-- Private bucket for KYC documents (CNH + bank statement prints).
-- Path pattern: {user_id}/{kind}-{timestamp}.{ext}
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Only the document owner can read/write their own folder.
CREATE POLICY documents_storage_select_own ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY documents_storage_insert_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
