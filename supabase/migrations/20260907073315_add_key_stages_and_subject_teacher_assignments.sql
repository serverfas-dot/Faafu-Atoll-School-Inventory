/*
# Add Key Stages, Class-Stage Mapping, and Subject Teacher Multi-Class Assignments

## Purpose
The school has 14 classes (LKG, UKG, Grade 1–8, Grade 9 SC, Grade 9 BS, Grade 10 SC, Grade 10 BS).
These classes are grouped into 3 Key Stages. Each Key Stage has a Lead Teacher who oversees
all records for classes in that stage. Subject Teachers can teach across multiple classes
(a many-to-many relationship between teachers and classes).

## New Tables

1. `key_stages`
   - `id` (uuid, PK)
   - `name` (text, NOT NULL) — e.g. "Key Stage 1"
   - `sort_order` (integer, default 0) — display ordering
   - `lead_teacher_id` (uuid, FK → teachers(id) ON DELETE SET NULL) — the lead teacher for this stage
   - `created_at` (timestamptz, default now())

2. `key_stage_classes`
   - `id` (uuid, PK)
   - `key_stage_id` (uuid, FK → key_stages(id) ON DELETE CASCADE)
   - `grade_name` (text, NOT NULL) — matches the name in grade_levels (e.g. "Grade 1", "LKG")
   - `sort_order` (integer, default 0)
   - `created_at` (timestamptz, default now())
   - UNIQUE constraint on (key_stage_id, grade_name) to prevent duplicate assignments

3. `teacher_class_assignments`
   - `id` (uuid, PK)
   - `teacher_id` (uuid, FK → teachers(id) ON DELETE CASCADE)
   - `grade_name` (text, NOT NULL) — the class this subject teacher teaches in
   - `subject` (text, default '') — optional subject specialization for this class assignment
   - `created_at` (timestamptz, default now())
   - UNIQUE constraint on (teacher_id, grade_name) to prevent duplicate assignments

## Seeded Data
- 3 Key Stages: "Key Stage 1", "Key Stage 2", "Key Stage 3"
- Default class-to-stage mapping:
  - Key Stage 1: LKG, UKG, Grade 1, Grade 2, Grade 3, Grade 4
  - Key Stage 2: Grade 5, Grade 6, Grade 7, Grade 8
  - Key Stage 3: Grade 9 SC, Grade 9 BS, Grade 10 SC, Grade 10 BS

## Security
- RLS enabled on all 3 new tables
- All tables open to anon + authenticated (single-tenant app, no Supabase Auth sign-in)
- 4 separate CRUD policies per table (SELECT, INSERT, UPDATE, DELETE)
*/

-- ── 1. key_stages ──
CREATE TABLE IF NOT EXISTS key_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  lead_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE key_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_key_stages" ON key_stages;
CREATE POLICY "anon_select_key_stages" ON key_stages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_key_stages" ON key_stages;
CREATE POLICY "anon_insert_key_stages" ON key_stages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_key_stages" ON key_stages;
CREATE POLICY "anon_update_key_stages" ON key_stages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_key_stages" ON key_stages;
CREATE POLICY "anon_delete_key_stages" ON key_stages FOR DELETE
  TO anon, authenticated USING (true);

-- ── 2. key_stage_classes ──
CREATE TABLE IF NOT EXISTS key_stage_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_stage_id uuid NOT NULL REFERENCES key_stages(id) ON DELETE CASCADE,
  grade_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(key_stage_id, grade_name)
);

ALTER TABLE key_stage_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_key_stage_classes" ON key_stage_classes;
CREATE POLICY "anon_select_key_stage_classes" ON key_stage_classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_key_stage_classes" ON key_stage_classes;
CREATE POLICY "anon_insert_key_stage_classes" ON key_stage_classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_key_stage_classes" ON key_stage_classes;
CREATE POLICY "anon_update_key_stage_classes" ON key_stage_classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_key_stage_classes" ON key_stage_classes;
CREATE POLICY "anon_delete_key_stage_classes" ON key_stage_classes FOR DELETE
  TO anon, authenticated USING (true);

-- ── 3. teacher_class_assignments ──
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  grade_name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, grade_name)
);

ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "anon_select_teacher_class_assignments" ON teacher_class_assignments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "anon_insert_teacher_class_assignments" ON teacher_class_assignments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "anon_update_teacher_class_assignments" ON teacher_class_assignments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "anon_delete_teacher_class_assignments" ON teacher_class_assignments FOR DELETE
  TO anon, authenticated USING (true);

-- ── 4. Seed 3 Key Stages ──
INSERT INTO key_stages (name, sort_order, lead_teacher_id)
SELECT 'Key Stage 1', 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 1');

INSERT INTO key_stages (name, sort_order, lead_teacher_id)
SELECT 'Key Stage 2', 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 2');

INSERT INTO key_stages (name, sort_order, lead_teacher_id)
SELECT 'Key Stage 3', 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 3');

-- ── 5. Seed default class-to-stage mapping ──
-- Key Stage 1: LKG, UKG, Grade 1–4
INSERT INTO key_stage_classes (key_stage_id, grade_name, sort_order)
SELECT ks.id, g.grade_name, g.sort_order
FROM (VALUES
  ('Key Stage 1', 'LKG', 1),
  ('Key Stage 1', 'UKG', 2),
  ('Key Stage 1', 'Grade 1', 3),
  ('Key Stage 1', 'Grade 2', 4),
  ('Key Stage 1', 'Grade 3', 5),
  ('Key Stage 1', 'Grade 4', 6),
  ('Key Stage 2', 'Grade 5', 1),
  ('Key Stage 2', 'Grade 6', 2),
  ('Key Stage 2', 'Grade 7', 3),
  ('Key Stage 2', 'Grade 8', 4),
  ('Key Stage 3', 'Grade 9 SC', 1),
  ('Key Stage 3', 'Grade 9 BS', 2),
  ('Key Stage 3', 'Grade 10 SC', 3),
  ('Key Stage 3', 'Grade 10 BS', 4)
) AS g(key_stage_name, grade_name, sort_order)
JOIN key_stages ks ON ks.name = g.key_stage_name
WHERE NOT EXISTS (
  SELECT 1 FROM key_stage_classes ksc
  WHERE ksc.key_stage_id = ks.id AND ksc.grade_name = g.grade_name
);

-- ── 6. Add index for common queries ──
CREATE INDEX IF NOT EXISTS idx_key_stage_classes_key_stage_id ON key_stage_classes(key_stage_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher_id ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_key_stages_lead_teacher_id ON key_stages(lead_teacher_id);