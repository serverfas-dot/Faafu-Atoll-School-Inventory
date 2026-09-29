/*
  # Fix Stock In Policies for Super Admin

  1. Changes
    - Update INSERT policy to allow both admin and super_admin roles
    - Update UPDATE policy to allow both admin and super_admin roles
    - Update DELETE policy to allow both admin and super_admin roles

  2. Security
    - Maintains RLS protection
    - Ensures both admin and super_admin users can manage stock_in records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert stock_in" ON stock_in;
DROP POLICY IF EXISTS "Admins can update stock_in" ON stock_in;
DROP POLICY IF EXISTS "Admins can delete stock_in" ON stock_in;

-- Recreate policies with support for both admin and super_admin
CREATE POLICY "Admins can insert stock_in"
  ON stock_in FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update stock_in"
  ON stock_in FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete stock_in"
  ON stock_in FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
