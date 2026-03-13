-- ============================================
-- VERSION 2: PHASE 1 MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- USER ROLES TABLE (RBAC)
-- ============================================
CREATE TYPE app_role AS ENUM ('ADMIN', 'DEALER', 'TECHNICIAN', 'DRIVER');

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'TECHNICIAN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins full access to user_roles" 
  ON user_roles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

-- Users can read their own role
CREATE POLICY "Users can read own role" 
  ON user_roles FOR SELECT 
  USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER trg_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert current authenticated user as ADMIN automatically (Bootstrap)
-- We need to make sure the app owner doesn't lock themselves out.
INSERT INTO user_roles (id, role)
SELECT id, 'ADMIN'::app_role FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEALERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to auth if they log in
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dealers_user_id ON dealers(user_id);

-- RLS for dealers
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins full access to dealers" 
  ON dealers FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

-- Dealers can read their own profile (if user_id is linked)
CREATE POLICY "Dealers can read own profile" 
  ON dealers FOR SELECT 
  USING (user_id = auth.uid());

CREATE TRIGGER trg_dealers_updated_at BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART REQUESTS TABLE
-- ============================================
CREATE TYPE part_request_status AS ENUM ('OPEN', 'BIDS_RECEIVED', 'APPROVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS part_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  tv_brand TEXT NOT NULL,
  tv_model TEXT,
  tv_size TEXT,
  description TEXT,
  status part_request_status NOT NULL DEFAULT 'OPEN',
  assigned_dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  approved_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_part_requests_status ON part_requests(status);
CREATE INDEX idx_part_requests_dealer ON part_requests(assigned_dealer_id);

-- RLS for part_requests
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins full access to part_requests" 
  ON part_requests FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

-- Dealers can view OPEN requests and their ASSIGNED requests
CREATE POLICY "Dealers can view open or assigned requests" 
  ON part_requests FOR SELECT 
  USING (
    status = 'OPEN' OR assigned_dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_part_requests_updated_at BEFORE UPDATE ON part_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART BIDS TABLE (Dealers bidding on requests)
-- ============================================
CREATE TABLE IF NOT EXISTS part_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a dealer can only bid once per request
CREATE UNIQUE INDEX idx_unique_bid_per_dealer ON part_bids(request_id, dealer_id);

-- RLS for part_bids
ALTER TABLE part_bids ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins full access to part_bids" 
  ON part_bids FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

-- Dealers can manage their own bids
CREATE POLICY "Dealers can manage own bids" 
  ON part_bids FOR ALL 
  USING (
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE TRIGGER trg_part_bids_updated_at BEFORE UPDATE ON part_bids FOR EACH ROW EXECUTE FUNCTION update_updated_at();
