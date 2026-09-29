/*
  # Remove Mobile Number from Profiles

  1. Changes
    - Drop `mobile_number` column from `profiles` table
    - This column is no longer needed as we've switched to email notifications
  
  2. Notes
    - Email notifications are now used instead of SMS
    - User emails are retrieved from auth.users table
    - No data migration needed as mobile numbers are no longer required
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE profiles DROP COLUMN mobile_number;
  END IF;
END $$;
