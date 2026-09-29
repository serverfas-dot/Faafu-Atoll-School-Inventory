/*
  # Create Backup System

  1. New Tables
    - `backups`
      - `id` (uuid, primary key) - Unique identifier for the backup
      - `backup_type` (text) - Type of backup: 'weekly' or 'monthly' or 'manual'
      - `backup_date` (timestamptz) - When the backup was created
      - `backup_data` (jsonb) - The actual backup data in JSON format
      - `created_by` (uuid) - ID of the user who created the backup
      - `created_at` (timestamptz) - Timestamp of creation
      - `notes` (text, nullable) - Optional notes about the backup
      
  2. Security
    - Enable RLS on `backups` table
    - Add policy for super admin to create backups
    - Add policy for super admin to view backups
    - Add policy for super admin to delete backups
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL CHECK (backup_type IN ('weekly', 'monthly', 'manual')),
  backup_date timestamptz NOT NULL DEFAULT now(),
  backup_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can create backups"
  ON backups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can view backups"
  ON backups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can delete backups"
  ON backups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );