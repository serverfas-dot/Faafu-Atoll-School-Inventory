/*
  # Fix Super Admin View Requests Policy

  1. Changes
    - Update the SELECT policy on stock_requests to allow both admin and super_admin roles to view all requests
    - Previously only admin role could view all requests, super_admin was excluded

  2. Security
    - Maintains security by only allowing admin and super_admin roles to see all requests
    - Regular users can still only see their own requests
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view requests" ON stock_requests;

-- Create new policy that allows both admin and super_admin to view all requests
CREATE POLICY "Users can view requests"
  ON stock_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );