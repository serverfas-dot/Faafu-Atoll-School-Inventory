/*
  # Add Super Admin and Management Tables

  1. Changes
    - Update profiles table to support super_admin role
    - Create approver_names table for managing approver list
    - Create authorized_requesters table for managing authorized requesters

  2. New Tables
    - `approver_names`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
    
    - `authorized_requesters`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on new tables
    - Only super admins can manage these tables
    - All authenticated users can read from these tables
*/

-- Update profiles role check constraint to include super_admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create approver_names table
CREATE TABLE IF NOT EXISTS approver_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approver_names ENABLE ROW LEVEL SECURITY;

-- Policies for approver_names
CREATE POLICY "Authenticated users can read approver names"
  ON approver_names FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert approver names"
  ON approver_names FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update approver names"
  ON approver_names FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete approver names"
  ON approver_names FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Create authorized_requesters table
CREATE TABLE IF NOT EXISTS authorized_requesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE authorized_requesters ENABLE ROW LEVEL SECURITY;

-- Policies for authorized_requesters
CREATE POLICY "Anyone can read authorized requesters"
  ON authorized_requesters FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins can insert authorized requesters"
  ON authorized_requesters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update authorized requesters"
  ON authorized_requesters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete authorized requesters"
  ON authorized_requesters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Insert default approver names
INSERT INTO approver_names (name) VALUES 
  ('Dr. Sarah Ahmed'),
  ('Mr. John Smith'),
  ('Ms. Maria Garcia'),
  ('Dr. Wei Chen')
ON CONFLICT (name) DO NOTHING;

-- Insert default authorized requesters
INSERT INTO authorized_requesters (name) VALUES 
  ('John Doe'),
  ('Jane Smith'),
  ('Mike Johnson'),
  ('Sarah Williams')
ON CONFLICT (name) DO NOTHING;