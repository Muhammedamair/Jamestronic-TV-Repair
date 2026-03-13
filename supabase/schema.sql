-- Jamestronic TV Repair - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  alt_mobile TEXT,
  address TEXT NOT NULL,
  area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_customers_name ON customers(name);

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TYPE ticket_status AS ENUM (
  'CREATED', 'DIAGNOSED', 'PICKUP_SCHEDULED', 'PICKED_UP',
  'IN_REPAIR', 'QUOTATION_SENT', 'APPROVED', 'REPAIRED',
  'DELIVERY_SCHEDULED', 'DELIVERED', 'CLOSED'
);

CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tv_brand TEXT NOT NULL,
  tv_model TEXT,
  tv_size TEXT,
  issue_description TEXT NOT NULL,
  diagnosed_issue TEXT,
  status ticket_status NOT NULL DEFAULT 'CREATED',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);

-- ============================================
-- TICKET NOTES TABLE
-- ============================================
CREATE TYPE note_type AS ENUM ('DIAGNOSIS', 'FOLLOW_UP', 'INTERNAL', 'CUSTOMER_UPDATE');

CREATE TABLE IF NOT EXISTS ticket_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  note_type note_type NOT NULL DEFAULT 'FOLLOW_UP',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_ticket ON ticket_notes(ticket_id);

-- ============================================
-- QUOTATIONS TABLE
-- ============================================
CREATE TYPE quotation_status AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  labour_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status quotation_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotations_ticket ON quotations(ticket_id);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID');

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id),
  amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_ticket ON invoices(ticket_id);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TYPE review_source AS ENUM ('GOOGLE', 'MANUAL', 'WHATSAPP');
CREATE TYPE review_status AS ENUM ('PENDING', 'RESPONDED', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  source review_source NOT NULL DEFAULT 'GOOGLE',
  response_text TEXT,
  status review_status NOT NULL DEFAULT 'PENDING',
  review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (Single Admin)
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (single admin)
CREATE POLICY "Admin full access" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON tickets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON ticket_notes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON reviews FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
