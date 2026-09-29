/*
  # Add Approver Name to Stock Out

  1. Changes
    - Add `approver_name` column to stock_out table to track who approved each stock out
    - This maintains a complete audit trail of who requested and who approved

  2. Notes
    - Field is optional (nullable) since existing records don't have this data
    - New stock out records will include the approver's name
*/

-- Add approver_name column to stock_out
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_out' AND column_name = 'approver_name'
  ) THEN
    ALTER TABLE stock_out ADD COLUMN approver_name text;
  END IF;
END $$;