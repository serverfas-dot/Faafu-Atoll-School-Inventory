ALTER TABLE class_records
  ADD COLUMN IF NOT EXISTS additional_class_type TEXT,
  ADD COLUMN IF NOT EXISTS additional_grade TEXT,
  ADD COLUMN IF NOT EXISTS additional_subject TEXT,
  ADD COLUMN IF NOT EXISTS additional_teacher TEXT,
  ADD COLUMN IF NOT EXISTS additional_no_of_students INTEGER,
  ADD COLUMN IF NOT EXISTS additional_contact TEXT,
  ADD COLUMN IF NOT EXISTS additional_date DATE,
  ADD COLUMN IF NOT EXISTS additional_time TEXT,
  ADD COLUMN IF NOT EXISTS additional_duration TEXT;
