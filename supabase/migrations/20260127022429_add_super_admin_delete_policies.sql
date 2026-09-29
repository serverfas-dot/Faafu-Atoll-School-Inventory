/*
  # Add Super Admin Delete Policies

  1. Changes
    - Update DELETE policies for stock_out table to allow super_admin role
    - Add DELETE policy for stock_requests table to allow super_admin role
    - This enables super admins to delete records through the UI

  2. Security
    - Only users with 'admin' or 'super_admin' roles can delete stock_out records
    - Only users with 'admin' or 'super_admin' roles can delete stock_requests records
*/

-- Drop existing DELETE policy for stock_out if it exists
DROP POLICY IF EXISTS "Admins can delete stock_out" ON stock_out;

-- Create new DELETE policy for stock_out that allows both admin and super_admin
CREATE POLICY "Admins and super admins can delete stock_out"
  ON stock_out FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Drop existing DELETE policy for stock_requests if it exists
DROP POLICY IF EXISTS "Admins can delete stock_requests" ON stock_requests;

-- Create new DELETE policy for stock_requests that allows both admin and super_admin
CREATE POLICY "Admins and super admins can delete stock_requests"
  ON stock_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );