-- Faafu Atoll School Stock Inventory System
-- Creates tables for managing school inventory with stock tracking and approval workflow

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  section text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text UNIQUE NOT NULL,
  item_description text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  stock_on_hand integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create stock_requests table
CREATE TABLE IF NOT EXISTS stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  section text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users ON DELETE SET NULL,
  approved_at timestamptz,
  notes text
);

ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON stock_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Staff can create requests"
  ON stock_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update requests"
  ON stock_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create stock_in table
CREATE TABLE IF NOT EXISTS stock_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  item_id uuid NOT NULL REFERENCES items ON DELETE CASCADE,
  po_number text,
  supplier_id uuid REFERENCES suppliers ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock_in"
  ON stock_in FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert stock_in"
  ON stock_in FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update stock_in"
  ON stock_in FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete stock_in"
  ON stock_in FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create stock_out table
CREATE TABLE IF NOT EXISTS stock_out (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  item_id uuid NOT NULL REFERENCES items ON DELETE CASCADE,
  section text NOT NULL,
  requested_employee text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  request_id uuid REFERENCES stock_requests ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_out ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock_out"
  ON stock_out FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert stock_out"
  ON stock_out FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update stock_out"
  ON stock_out FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete stock_out"
  ON stock_out FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create function to update stock_on_hand
CREATE OR REPLACE FUNCTION update_stock_on_hand()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_item_id := OLD.item_id;
  ELSE
    target_item_id := NEW.item_id;
  END IF;

  UPDATE items
  SET 
    stock_on_hand = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM stock_in 
      WHERE item_id = target_item_id
    ) - (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM stock_out 
      WHERE item_id = target_item_id
    ),
    updated_at = now()
  WHERE id = target_item_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stock calculation
DROP TRIGGER IF EXISTS trigger_stock_in_update ON stock_in;
CREATE TRIGGER trigger_stock_in_update
AFTER INSERT OR UPDATE OR DELETE ON stock_in
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_hand();

DROP TRIGGER IF EXISTS trigger_stock_out_update ON stock_out;
CREATE TRIGGER trigger_stock_out_update
AFTER INSERT OR UPDATE OR DELETE ON stock_out
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_hand();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_item_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_stock_in_date ON stock_in(date);
CREATE INDEX IF NOT EXISTS idx_stock_in_item_id ON stock_in(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out(date);
CREATE INDEX IF NOT EXISTS idx_stock_out_item_id ON stock_out(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_requested_by ON stock_requests(requested_by);