/*
  # Fix Public Request Submission Policy

  1. Changes
    - Update the INSERT policy for authenticated users to allow both:
      - Creating requests as themselves (requested_by = auth.uid())
      - Creating anonymous requests (requested_by IS NULL)
    - This allows authenticated users to also use the public request form

  2. Security
    - Maintains security by only allowing authenticated users to create requests
    - Anonymous users can still create requests via the anon policy
*/

-- Drop the existing authenticated insert policy
DROP POLICY IF EXISTS "Staff can create requests" ON stock_requests;

-- Create new policy that allows both authenticated and anonymous requests
CREATE POLICY "Staff can create requests"
  ON stock_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid() OR requested_by IS NULL);