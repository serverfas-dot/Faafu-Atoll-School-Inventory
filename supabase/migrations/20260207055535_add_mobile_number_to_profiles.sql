/*
  # Add Mobile Number to Profiles

  1. Changes
    - Add `mobile_number` column to `profiles` table
      - Type: text (to support international formats with + and country codes)
      - Optional field (nullable)
      - Will be used for SMS notifications when requests are approved/rejected
  
  2. Notes
    - Mobile numbers should be in international format (e.g., +1234567890)
    - No validation constraint added to allow flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mobile_number text;
  END IF;
END $$;