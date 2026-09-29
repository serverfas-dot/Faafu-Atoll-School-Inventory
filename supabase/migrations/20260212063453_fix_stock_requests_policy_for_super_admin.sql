/*
  # Fix Stock Requests Policy for Super Admin

  1. Changes
    - Update stock_requests UPDATE policy to allow both admin and super_admin roles

  2. Security
    - Maintains RLS protection
    - Ensures both admin and super_admin users can update stock requests
*/

-- Fix stock_requests table policy
DROP POLICY IF EXISTS "Admins can update requests" ON stock_requests;

CREATE POLICY "Admins can update requests"
  ON stock_requests FOR UPDATE
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
