/*
  # Allow deleting teachers

  Adds a DELETE policy on the teachers table so the super admin dashboard
  (which uses the anon key) can remove teacher records.
*/

CREATE POLICY "Anyone can delete teachers"
  ON teachers
  FOR DELETE
  TO anon
  USING (true);
