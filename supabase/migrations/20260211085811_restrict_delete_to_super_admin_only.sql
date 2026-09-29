/*
  # Restrict Delete to Super Admin Only

  1. Changes
    - Update DELETE policy for stock_requests to only allow super_admin role
    - Remove admin role from being able to delete requests
    - This ensures only super admin can delete approved/rejected requests

  2. Security
    - Only users with 'super_admin' role can delete stock_requests
    - When deleted, requests are permanently removed from database
*/

-- Drop existing DELETE policy for stock_requests
DROP POLICY IF EXISTS "Admins and super admins can delete stock_requests" ON stock_requests;

-- Create new DELETE policy for stock_requests that only allows super_admin
CREATE POLICY "Super admins can delete stock_requests"
  ON stock_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );