/*
  # Make purpose field optional in stock_requests

  1. Changes
    - Alter `stock_requests` table to make `purpose` column nullable with a default empty string
    - This allows public requests to be submitted without requiring a purpose
  
  2. Security
    - No changes to RLS policies
*/

ALTER TABLE stock_requests 
ALTER COLUMN purpose DROP NOT NULL,
ALTER COLUMN purpose SET DEFAULT '';