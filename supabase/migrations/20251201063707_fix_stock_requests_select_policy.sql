/*
  # Fix Stock Requests Select Policy

  1. Changes
    - Update the SELECT policy to allow admins to see ALL requests including public ones
    - Allow public (anonymous) requests with null requested_by to be visible to admins

  2. Security
    - Maintains security by only allowing admins to see all requests
    - Staff can still only see their own requests
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own requests" ON stock_requests;

-- Create new policy that properly handles null requested_by for public requests
CREATE POLICY "Users can view requests"
  ON stock_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );