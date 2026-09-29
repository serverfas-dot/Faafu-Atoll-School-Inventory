/*
  # Add Approver Name to Stock Requests

  1. Changes
    - Add `approver_name` column to stock_requests table to store the name of person approving/rejecting
    - This allows tracking who physically approved/rejected each request

  2. Notes
    - Field is optional (nullable) since existing records don't have this data
    - Will be filled when admin approves or rejects a request
*/

-- Add approver_name column to stock_requests
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'approver_name'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN approver_name text;
  END IF;
END $$;