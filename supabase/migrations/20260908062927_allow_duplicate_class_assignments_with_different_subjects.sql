/*
# Allow duplicate class assignments with different subjects

## Problem
The UNIQUE constraint on (teacher_id, grade_name) prevents a subject teacher
from being assigned to the same class twice with different subjects.

## Fix
Drop the old unique constraint and replace it with one that includes subject,
so (teacher_id, grade_name, subject) must be unique instead. This allows the
same teacher to teach the same class for two different subjects.
*/

-- Drop the old constraint that blocked same-class assignments
ALTER TABLE teacher_class_assignments
  DROP CONSTRAINT IF EXISTS teacher_class_assignments_teacher_id_grade_name_key;

-- Add new constraint that allows same class + different subjects
ALTER TABLE teacher_class_assignments
  ADD CONSTRAINT teacher_class_assignments_teacher_id_grade_name_subject_key
  UNIQUE (teacher_id, grade_name, subject);
