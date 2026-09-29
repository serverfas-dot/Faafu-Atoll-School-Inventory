/*
  # Add configurable Roles, Classes, and Subjects tables

  1. New Tables
    - `teacher_roles` — list of teacher role options (e.g. Class Teacher, Principal)
    - `grade_levels`  — list of class/grade options (e.g. 1A, Grade 7)
    - `subjects`      — list of subject options (e.g. Mathematics, Science)

  2. Security
    - RLS enabled on all three tables
    - Super admins (authenticated via super_admins table) manage via service role
    - Public SELECT allowed so the form can read the options
    - INSERT/UPDATE/DELETE restricted to authenticated sessions

  3. Seed data
    - Pre-populate with the existing hardcoded defaults
*/

CREATE TABLE IF NOT EXISTS teacher_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grade_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects      ENABLE ROW LEVEL SECURITY;

-- Public can read all options (needed for the public form)
CREATE POLICY "Public can read teacher_roles"
  ON teacher_roles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read grade_levels"
  ON grade_levels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read subjects"
  ON subjects FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users (super admin via anon key + RLS bypass not needed — use service role in edge fn)
-- For simplicity, allow authenticated insert/update/delete (super admin login sets a session flag)
CREATE POLICY "Authenticated can insert teacher_roles"
  ON teacher_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update teacher_roles"
  ON teacher_roles FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete teacher_roles"
  ON teacher_roles FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert grade_levels"
  ON grade_levels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update grade_levels"
  ON grade_levels FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete grade_levels"
  ON grade_levels FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update subjects"
  ON subjects FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (true);

-- Seed teacher_roles
INSERT INTO teacher_roles (name, sort_order) VALUES
  ('Class Teacher', 1),
  ('Assistant Teacher', 2),
  ('Leading Teacher', 3),
  ('Subject Teacher', 4),
  ('Admin Staff', 5),
  ('Principal', 6)
ON CONFLICT (name) DO NOTHING;

-- Seed grade_levels
INSERT INTO grade_levels (name, sort_order) VALUES
  ('Pre-K', 1), ('Kindergarten', 2),
  ('1A', 3), ('1B', 4), ('1C', 5),
  ('2A', 6), ('2B', 7), ('2C', 8),
  ('3A', 9), ('3B', 10), ('3C', 11),
  ('4A', 12), ('4B', 13), ('4C', 14),
  ('5A', 15), ('5B', 16), ('5C', 17),
  ('6A', 18), ('6B', 19), ('6C', 20),
  ('Grade 7', 21), ('Grade 8', 22), ('Grade 9', 23),
  ('Grade 10', 24), ('Grade 11', 25), ('Grade 12', 26)
ON CONFLICT (name) DO NOTHING;

-- Seed subjects
INSERT INTO subjects (name, sort_order) VALUES
  ('Mathematics', 1), ('English Language', 2), ('Science', 3),
  ('Social Studies', 4), ('Filipino', 5), ('MAPEH', 6),
  ('TLE/TVL', 7), ('Values Education', 8), ('Computer Science', 9),
  ('Physical Education', 10), ('Health', 11), ('Arts', 12),
  ('Music', 13), ('Business Studies', 14), ('Administration', 15), ('Other', 16)
ON CONFLICT (name) DO NOTHING;
