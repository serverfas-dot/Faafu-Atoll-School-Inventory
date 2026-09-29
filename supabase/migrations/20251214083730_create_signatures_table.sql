/*
  # Create Signatures Table

  1. New Tables
    - `signatures`
      - `id` (uuid, primary key)
      - `person_name` (text, unique) - Name of the person
      - `signature_data` (text) - Base64 encoded signature image
      - `role` (text) - Role of the person (e.g., 'authorized', 'approver', 'both')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `signatures` table
    - Add policy for authenticated users to read all signatures
    - Add policy for authenticated users to insert/update signatures
  
  3. Purpose
    - Store signatures for different people so each person has their own signature
    - When a person is selected, their signature automatically loads
*/

CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text UNIQUE NOT NULL,
  signature_data text NOT NULL,
  role text DEFAULT 'both',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all signatures"
  ON signatures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signatures"
  ON signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update signatures"
  ON signatures
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete signatures"
  ON signatures
  FOR DELETE
  TO authenticated
  USING (true);