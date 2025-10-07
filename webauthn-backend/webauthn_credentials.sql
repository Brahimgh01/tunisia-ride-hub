-- Table for storing WebAuthn credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
