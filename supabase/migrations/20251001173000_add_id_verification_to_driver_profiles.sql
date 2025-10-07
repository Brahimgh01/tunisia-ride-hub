ALTER TABLE public.driver_profiles
ADD COLUMN id_document_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN id_document_verification_status TEXT DEFAULT 'PENDING';

COMMENT ON COLUMN public.driver_profiles.id_document_verified IS 'Whether the AI has verified the uploaded document as a license.';
COMMENT ON COLUMN public.driver_profiles.id_document_verification_status IS 'The detailed status from the AI verification (e.g., PENDING, VERIFIED, REJECTED).';
