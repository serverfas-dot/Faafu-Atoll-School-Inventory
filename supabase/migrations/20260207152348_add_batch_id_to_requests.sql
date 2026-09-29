/*
  # Add Batch ID for Grouped Requests

  1. Changes
    - Add `batch_id` column to `stock_requests` table to group multiple items submitted together
    - Add index on `batch_id` for efficient querying of grouped requests
  
  2. Purpose
    - Allows multiple items submitted in one request to be grouped together
    - Enables single approval for multiple items
    - Facilitates batch notifications with all items listed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_requests' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN batch_id uuid;
    CREATE INDEX IF NOT EXISTS idx_stock_requests_batch_id ON stock_requests(batch_id);
  END IF;
END $$;
