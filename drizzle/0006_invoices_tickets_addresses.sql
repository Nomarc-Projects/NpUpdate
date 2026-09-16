-- Invoice table
CREATE TABLE IF NOT EXISTS invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES sales_order(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'order',
  issuer_company_id UUID REFERENCES company(id) ON DELETE SET NULL,
  issuer_name TEXT,
  issuer_address TEXT,
  issuer_email TEXT,
  recipient_user_id TEXT,
  recipient_name TEXT,
  recipient_company TEXT,
  recipient_address TEXT,
  recipient_email TEXT,
  subtotal INTEGER DEFAULT 0,
  vat INTEGER DEFAULT 0,
  vat_rate INTEGER DEFAULT 750,
  shipping INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'issued',
  issued_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  reporter_email TEXT,
  category TEXT DEFAULT 'other',
  subject TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES sales_order(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT DEFAULT 'user',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Buyer addresses
CREATE TABLE IF NOT EXISTS buyer_address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer notes
CREATE TABLE IF NOT EXISTS customer_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  buyer_user_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
