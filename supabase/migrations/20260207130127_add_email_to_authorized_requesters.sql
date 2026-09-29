/*
  # Add Email to Authorized Requesters

  1. Changes
    - Add email column to authorized_requesters table
    - Email is optional to maintain compatibility with existing data
  
  2. Notes
    - Existing requesters without emails can still be used
    - Email can be added later for those requesters
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'authorized_requesters' AND column_name = 'email'
  ) THEN
    ALTER TABLE authorized_requesters ADD COLUMN email text;
  END IF;
END $$;
