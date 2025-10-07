-- Create driver_documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driver_documents', 'driver_documents', true, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for driver_documents bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver_documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver_documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver_documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
