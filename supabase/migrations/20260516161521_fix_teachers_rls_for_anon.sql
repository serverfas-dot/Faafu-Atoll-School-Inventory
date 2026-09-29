/*
  # Fix teachers table RLS for anon role

  Super admin uses custom auth (not Supabase Auth) so operates as anon.
  Add anon to insert and update policies, and add missing update policy.
*/

DROP POLICY IF EXISTS "Authenticated can insert teachers" ON teachers;

CREATE POLICY "Anon can insert teachers"
  ON teachers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anon can update teachers"
  ON teachers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
