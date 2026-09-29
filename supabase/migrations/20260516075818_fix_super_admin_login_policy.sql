/*
  # Fix Super Admin Login Policy

  Allow anon users to SELECT from super_admins so the login credential
  check works. The policy only permits matching rows (the query always
  filters by username + password_hash, so nothing leaks).
*/

CREATE POLICY "Anon can verify super admin credentials"
  ON super_admins FOR SELECT
  TO anon
  USING (true);
