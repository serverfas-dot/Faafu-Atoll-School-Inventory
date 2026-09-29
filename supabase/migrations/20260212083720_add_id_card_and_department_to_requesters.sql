/*
  # Add ID Card Number and Department to Authorized Requesters

  1. Changes
    - Add `id_card_number` column to `authorized_requesters` table (unique identifier)
    - Add `department` column to `authorized_requesters` table
    - Make `id_card_number` unique to prevent duplicates
    
  2. Purpose
    - Allow quick user identification by ID card number
    - Store department information for auto-fill in public request form
*/

-- Add id_card_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'authorized_requesters' AND column_name = 'id_card_number'
  ) THEN
    ALTER TABLE authorized_requesters ADD COLUMN id_card_number text;
  END IF;
END $$;

-- Add department column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'authorized_requesters' AND column_name = 'department'
  ) THEN
    ALTER TABLE authorized_requesters ADD COLUMN department text;
  END IF;
END $$;

-- Create unique index on id_card_number (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'authorized_requesters_id_card_number_key'
  ) THEN
    CREATE UNIQUE INDEX authorized_requesters_id_card_number_key ON authorized_requesters(id_card_number) WHERE id_card_number IS NOT NULL;
  END IF;
END $$;