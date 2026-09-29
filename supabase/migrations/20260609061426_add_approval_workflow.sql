
-- Add approval workflow columns to class_records
-- Existing records default to 'approved' (already in system)
ALTER TABLE class_records
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS class_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS class_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS lead_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- Set existing rows to approved
UPDATE class_records SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Make it NOT NULL and constrain values
ALTER TABLE class_records ALTER COLUMN approval_status SET NOT NULL;
ALTER TABLE class_records ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE class_records
  ADD CONSTRAINT class_records_approval_status_check
  CHECK (approval_status IN ('pending', 'class_approved', 'approved', 'rejected'));

-- Add teacher login fields
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS pin TEXT,
  ADD COLUMN IF NOT EXISTS is_lead_teacher BOOLEAN NOT NULL DEFAULT false;

-- Allow anon to update class_records (needed for approval portals)
DROP POLICY IF EXISTS "anon_update_class_records" ON class_records;
CREATE POLICY "anon_update_class_records" ON class_records
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
