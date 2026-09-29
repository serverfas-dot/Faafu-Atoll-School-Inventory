/*
  # Add Email to Profiles and Auto-Sync from Auth

  1. Changes
    - Add `email` column to `profiles` table
    - Create trigger to automatically sync email from auth.users
    - Backfill existing profiles with emails from auth.users
  
  2. Security
    - Email is synced automatically when profiles are created
    - Users can read their own email from profiles
  
  3. Notes
    - Email is required for sending approval/rejection notifications
    - Synced from auth.users table automatically
*/

-- Add email column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create function to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get email from auth.users and update profile
  UPDATE profiles
  SET email = (
    SELECT email 
    FROM auth.users 
    WHERE id = NEW.id
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync email after profile insert
DROP TRIGGER IF EXISTS sync_profile_email_on_insert ON profiles;
CREATE TRIGGER sync_profile_email_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- Backfill existing profiles with emails from auth.users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;
