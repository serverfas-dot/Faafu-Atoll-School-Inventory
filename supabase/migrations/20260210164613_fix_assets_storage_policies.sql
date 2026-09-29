/*
  # Fix Assets Storage Bucket Policies
  
  1. Changes
    - Allow public uploads to assets bucket (for logo upload)
    - Ensure public read access is working
  
  2. Security
    - Public can read from assets bucket
    - Anyone can upload to assets bucket (for initial setup)
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON storage.objects;

-- Allow public read access to assets bucket
CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Allow anyone to upload to assets bucket
CREATE POLICY "Anyone can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

-- Allow anyone to update assets
CREATE POLICY "Anyone can update assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');
