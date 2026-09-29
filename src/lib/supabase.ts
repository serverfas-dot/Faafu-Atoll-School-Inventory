import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://danpvbypybrwnruisfsg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbnB2YnlweWJyd25ydWlzZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Nzg0NDIsImV4cCI6MjA5NDM1NDQ0Mn0.7GthjssgzEqcp5KdqedhT0cYFNFok3FCxfAVgoNJzTM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Teacher = {
  id: string;
  name: string;
  role: string;
  grade: string;
  subject: string;
  contact: string;
  pin: string;
  is_class_teacher: boolean;
  is_lead_teacher: boolean;
  assigned_lead_id: string | null;
  created_at: string;
};

export type OptionItem = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type KeyStage = {
  id: string;
  name: string;
  sort_order: number;
  lead_teacher_id: string | null;
  created_at: string;
};

export type KeyStageClass = {
  id: string;
  key_stage_id: string;
  grade_name: string;
  sort_order: number;
  created_at: string;
};

export type TeacherClassAssignment = {
  id: string;
  teacher_id: string;
  grade_name: string;
  subject: string;
  created_at: string;
};

export type ApprovalStatus = 'pending' | 'class_approved' | 'approved' | 'rejected';

export type ClassRecord = {
  id: string;
  created_at: string;
  submitted_at: string;
  record_date: string;
  record_time: string;
  day_of_week: string;
  grade: string;
  subject: string;
  topic: string;
  class_period: string;
  teacher_name: string;
  teacher_role: string;
  contact_detail: string;
  exit_note: string;
  total_students: number;
  students_present: number;
  students_absent: number;
  lesson_objectives: string;
  activities_conducted: string;
  homework_assigned: string;
  remarks: string;
  class_status: 'completed' | 'cancelled' | 'partial';
  approval_status: ApprovalStatus;
  class_approved_by: string;
  class_approved_at: string;
  lead_approved_by: string;
  lead_approved_at: string;
  rejection_note: string;
  assigned_lead_id: string | null;
  additional_class_type: string | null;
  additional_grade: string | null;
  additional_subject: string | null;
  additional_teacher: string | null;
  additional_no_of_students: number | null;
  additional_contact: string | null;
  additional_date: string | null;
  additional_time: string | null;
  additional_duration: string | null;
};
