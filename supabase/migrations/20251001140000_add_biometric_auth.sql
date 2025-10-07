-- Migration: Add biometric fields for WebAuthn (fingerprint/face) to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webauthn_sign_count BIGINT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT FALSE;

-- Optionally, log biometric verification attempts
CREATE TABLE IF NOT EXISTS public.biometric_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('fingerprint', 'face')),
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
