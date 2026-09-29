/*
  # Add Requester Email to Stock Requests

  1. Changes
    - Add `requester_email` column to `stock_requests` table to store email for public requests
    - This allows notifications to be sent to public requesters who don't have user accounts
  
  2. Notes
    - For authenticated users, email comes from profiles table
    - For public requests, email comes from this new field
*/

-- Add requester_email column to stock_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_requests' AND column_name = 'requester_email'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN requester_email text;
  END IF;
END $$;
