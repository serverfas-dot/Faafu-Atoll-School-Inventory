import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl || 'MISSING',
    key: supabaseAnonKey ? 'present' : 'MISSING'
  });
  console.error('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  section: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  item_code: string;
  item_description: string;
  unit: string;
  stock_on_hand: number;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type StockIn = {
  id: string;
  date: string;
  item_id: string;
  item_code: string;
  item_description: string;
  po_number: string | null;
  supplier_id: string | null;
  quantity: number;
  stock_in: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockOut = {
  id: string;
  date: string;
  item_id: string;
  item_code: string;
  item_description: string;
  section: string;
  requested_employee: string;
  quantity: number;
  stock_out: number;
  notes: string | null;
  request_id: string | null;
  approver_name: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockRequest = {
  id: string;
  item_id: string;
  quantity: number;
  section: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  requester_name: string | null;
  requester_email: string | null;
  requested_at: string;
  approved_by: string | null;
  approver_name: string | null;
  approved_at: string | null;
  notes: string | null;
};
