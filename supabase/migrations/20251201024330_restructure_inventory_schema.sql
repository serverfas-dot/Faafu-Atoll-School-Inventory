/*
  # Restructure Inventory Schema

  1. Changes to Tables
    - `items` table:
      - Rename `unit` to match simpler structure
      - Keep item_code and item_description
      - stock_on_hand will be calculated from stock_in and stock_out
    
    - `stock_in` table:
      - Add item_code column for easier reference
      - Add item_description column for easier reference
      - Rename quantity to stock_in
      - Keep date, po_no, supplier
    
    - `stock_out` table:
      - Add item_code column for easier reference
      - Add item_description column for easier reference
      - Rename quantity to stock_out
      - Keep date, section, requested_employee

  2. Notes
    - Using IF NOT EXISTS to prevent errors on re-run
    - Preserving existing data where possible
*/

-- Add columns to stock_in table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_in' AND column_name = 'item_code'
  ) THEN
    ALTER TABLE stock_in ADD COLUMN item_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_in' AND column_name = 'item_description'
  ) THEN
    ALTER TABLE stock_in ADD COLUMN item_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_in' AND column_name = 'stock_in'
  ) THEN
    ALTER TABLE stock_in ADD COLUMN stock_in integer;
  END IF;
END $$;

-- Update stock_in with item details and copy quantity to stock_in
UPDATE stock_in si
SET 
  item_code = i.item_code,
  item_description = i.item_description,
  stock_in = COALESCE(si.stock_in, si.quantity)
FROM items i
WHERE si.item_id = i.id AND si.item_code IS NULL;

-- Add columns to stock_out table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_out' AND column_name = 'item_code'
  ) THEN
    ALTER TABLE stock_out ADD COLUMN item_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_out' AND column_name = 'item_description'
  ) THEN
    ALTER TABLE stock_out ADD COLUMN item_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_out' AND column_name = 'stock_out'
  ) THEN
    ALTER TABLE stock_out ADD COLUMN stock_out integer;
  END IF;
END $$;

-- Update stock_out with item details and copy quantity to stock_out
UPDATE stock_out so
SET 
  item_code = i.item_code,
  item_description = i.item_description,
  stock_out = COALESCE(so.stock_out, so.quantity)
FROM items i
WHERE so.item_id = i.id AND so.item_code IS NULL;

-- Create or replace function to calculate stock_on_hand
CREATE OR REPLACE FUNCTION calculate_stock_on_hand(item_uuid uuid)
RETURNS integer AS $$
DECLARE
  total_in integer;
  total_out integer;
BEGIN
  SELECT COALESCE(SUM(stock_in), 0) INTO total_in
  FROM stock_in
  WHERE item_id = item_uuid;
  
  SELECT COALESCE(SUM(stock_out), 0) INTO total_out
  FROM stock_out
  WHERE item_id = item_uuid;
  
  RETURN total_in - total_out;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update stock_on_hand
CREATE OR REPLACE FUNCTION update_stock_on_hand()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'stock_in' THEN
    UPDATE items
    SET stock_on_hand = calculate_stock_on_hand(NEW.item_id)
    WHERE id = NEW.item_id;
  ELSIF TG_TABLE_NAME = 'stock_out' THEN
    UPDATE items
    SET stock_on_hand = calculate_stock_on_hand(NEW.item_id)
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_stock_on_hand_after_stock_in ON stock_in;
DROP TRIGGER IF EXISTS update_stock_on_hand_after_stock_out ON stock_out;

-- Create triggers to auto-update stock_on_hand
CREATE TRIGGER update_stock_on_hand_after_stock_in
  AFTER INSERT OR UPDATE ON stock_in
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_hand();

CREATE TRIGGER update_stock_on_hand_after_stock_out
  AFTER INSERT OR UPDATE ON stock_out
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_hand();

-- Recalculate all stock_on_hand values
UPDATE items
SET stock_on_hand = calculate_stock_on_hand(id);