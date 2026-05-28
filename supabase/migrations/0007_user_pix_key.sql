-- 0007_user_pix_key.sql — chave Pix do user (1x cadastro, reusa em loans seguintes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key_type pix_key_type;

COMMENT ON COLUMN users.pix_key       IS 'Chave Pix do user — preenchida no 1o saque, reutilizada nos seguintes.';
COMMENT ON COLUMN users.pix_key_type  IS 'Tipo da chave (cpf, email, phone, evp).';
