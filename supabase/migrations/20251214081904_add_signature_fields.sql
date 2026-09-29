/*
  # Add Signature Fields to Stock Requests

  1. Changes
    - Add `requester_signature` column to store requester's digital signature (base64 image)
    - Add `approver_signature` column to store approver's digital signature (base64 image)
    - Add `authorized_signature` column to store authorizer's digital signature (base64 image)
  
  2. Notes
    - Signatures are stored as text (base64 encoded PNG images)
    - Signatures are optional and can be NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_requests' AND column_name = 'requester_signature'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN requester_signature text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_requests' AND column_name = 'approver_signature'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN approver_signature text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_requests' AND column_name = 'authorized_signature'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN authorized_signature text;
  END IF;
END $$;