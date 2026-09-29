-- Which lead teacher each teacher is assigned to (set in SuperAdmin)
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS assigned_lead_id uuid REFERENCES teachers(id) ON DELETE SET NULL;

-- Which lead teacher should review a given class_record (set when class teacher forwards it)
ALTER TABLE class_records
  ADD COLUMN IF NOT EXISTS assigned_lead_id uuid REFERENCES teachers(id) ON DELETE SET NULL;
