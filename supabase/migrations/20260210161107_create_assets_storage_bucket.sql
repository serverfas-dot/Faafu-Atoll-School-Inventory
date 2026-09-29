/*
  # Create Storage Bucket for Assets
  
  1. New Storage Bucket
    - `assets` - Public bucket for storing logos and images
  
  2. Security
    - Enable public access for reading
    - Allow authenticated users to upload
*/

-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'assets');
  END IF;
END $$;

-- Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload assets'
  ) THEN
    CREATE POLICY "Authenticated users can upload assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'assets');
  END IF;
END $$;

-- Allow authenticated users to update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update assets'
  ) THEN
    CREATE POLICY "Authenticated users can update assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'assets');
  END IF;
END $$;
