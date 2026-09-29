-- Allow public (anonymous) users to view items
CREATE POLICY "Anyone can view items"
  ON items FOR SELECT
  TO anon
  USING (true);

-- Allow public (anonymous) users to insert stock requests
CREATE POLICY "Anyone can create requests"
  ON stock_requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- Modify stock_requests table to make requested_by nullable for public requests
ALTER TABLE stock_requests ALTER COLUMN requested_by DROP NOT NULL;

-- Add requester_name field for public requests
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'requester_name'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN requester_name text;
  END IF;
END $$;