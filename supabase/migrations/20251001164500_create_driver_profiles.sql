
-- Create a table for public driver profiles
CREATE TABLE driver_profiles (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id),
  vehicle_type TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  license_number TEXT,
  license_document_url TEXT,
  vehicle_registration_document_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create a storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_documents', 'driver_documents', true);

-- Add policies for driver documents
CREATE POLICY "Enable read access for authenticated users" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'driver_documents');
CREATE POLICY "Enable insert for authenticated users" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'driver_documents');
CREATE POLICY "Enable update for users based on user_id" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (bucket_id = 'driver_documents');
CREATE POLICY "Enable delete for users based on user_id" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner_id);

