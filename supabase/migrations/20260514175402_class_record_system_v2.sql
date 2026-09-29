/*
  # Class Record System v2

  ## New Tables

  ### teachers
  - id, name, role, grade, subject, contact
  - Pre-registered teacher profiles so the form auto-fills on name selection

  ### class_records
  - Full record of each class session
  - Links to teacher by teacher_name (denormalised for simplicity)
  - Fields: date, time, day_of_week, grade, subject, teacher_name, teacher_role,
    contact_detail, exit_note, total_students, students_present, students_absent,
    class_status, remarks

  ## Security
  - RLS enabled on both tables
  - Public (anon) can read teachers (for form auto-fill) and insert/read class_records
  - super_admins table untouched from v1

  ## Notes
  - No edit or delete policies are created intentionally
*/

-- Teachers lookup table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Class Teacher',
  grade text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read teachers"
  ON teachers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can insert teachers"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop old class_records if exists and recreate with new schema
-- We use IF NOT EXISTS + add missing columns safely
CREATE TABLE IF NOT EXISTS class_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz DEFAULT now(),
  record_date date NOT NULL,
  record_time time NOT NULL,
  day_of_week text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  class_period text NOT NULL DEFAULT '',
  teacher_name text NOT NULL DEFAULT '',
  teacher_role text NOT NULL DEFAULT '',
  contact_detail text NOT NULL DEFAULT '',
  exit_note text NOT NULL DEFAULT '',
  total_students integer NOT NULL DEFAULT 0,
  students_present integer NOT NULL DEFAULT 0,
  students_absent integer NOT NULL DEFAULT 0,
  lesson_objectives text NOT NULL DEFAULT '',
  activities_conducted text NOT NULL DEFAULT '',
  homework_assigned text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  class_status text NOT NULL DEFAULT 'completed' CHECK (class_status IN ('completed', 'cancelled', 'partial'))
);

-- Add new columns if they don't exist yet (safe for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_records' AND column_name='contact_detail') THEN
    ALTER TABLE class_records ADD COLUMN contact_detail text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_records' AND column_name='exit_note') THEN
    ALTER TABLE class_records ADD COLUMN exit_note text NOT NULL DEFAULT '';
  END IF;
END $$;

ALTER TABLE class_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'class_records' AND policyname = 'Anyone can insert class records'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can insert class records" ON class_records FOR INSERT TO anon, authenticated WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'class_records' AND policyname = 'Anyone can view class records'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view class records" ON class_records FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- Super admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'super_admins' AND policyname = 'No direct access to super_admins'
  ) THEN
    EXECUTE 'CREATE POLICY "No direct access to super_admins" ON super_admins FOR SELECT TO authenticated USING (false)';
  END IF;
END $$;

INSERT INTO super_admins (username, password_hash)
VALUES ('superadmin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- Seed a few sample teachers
INSERT INTO teachers (name, role, grade, subject, contact) VALUES
  ('Ms. Sarah Johnson', 'Class Teacher', 'Grade 5', 'Mathematics', 'sarah.johnson@school.edu'),
  ('Mr. David Lee', 'Class Teacher', 'Grade 6', 'English Language', 'david.lee@school.edu'),
  ('Mrs. Anna Cruz', 'Assistant Teacher', 'Grade 4', 'Science', 'anna.cruz@school.edu'),
  ('Mr. James Reyes', 'Leading Teacher', 'Grade 7', 'Social Studies', 'james.reyes@school.edu'),
  ('Ms. Maria Santos', 'Class Teacher', 'Grade 3', 'Filipino', 'maria.santos@school.edu'),
  ('Mr. Robert Tan', 'Subject Teacher', 'Grade 8', 'Mathematics', 'robert.tan@school.edu'),
  ('Mrs. Linda Garcia', 'Class Teacher', 'Grade 2', 'English Language', 'linda.garcia@school.edu'),
  ('Mr. Principal Admin', 'Principal', 'All Grades', 'Administration', 'principal@school.edu')
ON CONFLICT DO NOTHING;
