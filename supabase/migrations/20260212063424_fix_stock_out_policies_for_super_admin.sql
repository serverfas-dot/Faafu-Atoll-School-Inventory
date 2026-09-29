/*
  # Fix Stock Out Policies for Super Admin

  1. Changes
    - Update INSERT policy to allow both admin and super_admin roles
    - Update UPDATE policy to allow both admin and super_admin roles

  2. Security
    - Maintains RLS protection
    - Ensures both admin and super_admin users can manage stock_out records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert stock_out" ON stock_out;
DROP POLICY IF EXISTS "Admins can update stock_out" ON stock_out;

-- Recreate policies with support for both admin and super_admin
CREATE POLICY "Admins can insert stock_out"
  ON stock_out FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update stock_out"
  ON stock_out FOR UPDATE
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
