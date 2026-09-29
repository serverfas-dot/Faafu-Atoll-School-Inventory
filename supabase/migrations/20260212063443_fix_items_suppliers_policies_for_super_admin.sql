/*
  # Fix Items and Suppliers Policies for Super Admin

  1. Changes
    - Update items INSERT and UPDATE policies to allow both admin and super_admin roles
    - Update suppliers INSERT and UPDATE policies to allow both admin and super_admin roles

  2. Security
    - Maintains RLS protection
    - Ensures both admin and super_admin users can manage items and suppliers
*/

-- Fix Items table policies
DROP POLICY IF EXISTS "Admins can insert items" ON items;
DROP POLICY IF EXISTS "Admins can update items" ON items;

CREATE POLICY "Admins can insert items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Fix Suppliers table policies
DROP POLICY IF EXISTS "Admins can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;

CREATE POLICY "Admins can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
