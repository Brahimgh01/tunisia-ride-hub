
ALTER TABLE driver_profiles
ADD COLUMN id_verification_status TEXT DEFAULT 'pending',
ADD COLUMN id_document_front_url TEXT,
ADD COLUMN id_document_back_url TEXT;
