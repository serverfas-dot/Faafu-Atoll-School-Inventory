/*
  # Fix RLS policies for teacher_roles, grade_levels, subjects

  The super admin uses a custom password check (not Supabase Auth), so the
  client operates as the `anon` role. Previous policies only allowed
  `authenticated`. This migration drops those and adds anon-inclusive policies.
*/

-- teacher_roles
DROP POLICY IF EXISTS "Authenticated can insert teacher_roles" ON teacher_roles;
DROP POLICY IF EXISTS "Authenticated can update teacher_roles" ON teacher_roles;
DROP POLICY IF EXISTS "Authenticated can delete teacher_roles" ON teacher_roles;

CREATE POLICY "Anon can insert teacher_roles"
  ON teacher_roles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anon can update teacher_roles"
  ON teacher_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete teacher_roles"
  ON teacher_roles FOR DELETE TO anon, authenticated USING (true);

-- grade_levels
DROP POLICY IF EXISTS "Authenticated can insert grade_levels" ON grade_levels;
DROP POLICY IF EXISTS "Authenticated can update grade_levels" ON grade_levels;
DROP POLICY IF EXISTS "Authenticated can delete grade_levels" ON grade_levels;

CREATE POLICY "Anon can insert grade_levels"
  ON grade_levels FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anon can update grade_levels"
  ON grade_levels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete grade_levels"
  ON grade_levels FOR DELETE TO anon, authenticated USING (true);

-- subjects
DROP POLICY IF EXISTS "Authenticated can insert subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated can update subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated can delete subjects" ON subjects;

CREATE POLICY "Anon can insert subjects"
  ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anon can update subjects"
  ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete subjects"
  ON subjects FOR DELETE TO anon, authenticated USING (true);
