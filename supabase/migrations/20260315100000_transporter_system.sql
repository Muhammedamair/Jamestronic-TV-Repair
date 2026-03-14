-- ============================================
-- TRANSPORTER SYSTEM MIGRATION
-- Tables, RPC, RLS, Indexes, Realtime
-- ============================================

-- ============================================
-- 1. TRANSPORTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transporters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Bike' CHECK (vehicle_type IN ('Bike', 'Auto', 'Mini Truck', 'Truck')),
  vehicle_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transporters_user_id ON public.transporters(user_id);
CREATE INDEX idx_transporters_status ON public.transporters(status);

-- Updated_at trigger
CREATE TRIGGER trg_transporters_updated_at
  BEFORE UPDATE ON public.transporters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. TRANSPORT_JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transport_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_request_id UUID REFERENCES public.part_requests(id) ON DELETE SET NULL,
  transporter_id UUID REFERENCES public.transporters(id) ON DELETE SET NULL,
  
  -- Pickup
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_contact_name TEXT,
  pickup_contact_mobile TEXT,
  
  -- Drop
  drop_address TEXT NOT NULL,
  drop_lat DOUBLE PRECISION,
  drop_lng DOUBLE PRECISION,
  drop_contact_name TEXT DEFAULT 'JamesTronic Store',
  drop_contact_mobile TEXT,
  
  -- Item info
  item_description TEXT,
  
  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN (
    'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
  )),
  
  -- Live tracking
  live_lat DOUBLE PRECISION,
  live_lng DOUBLE PRECISION,
  live_updated_at TIMESTAMPTZ,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transport_jobs_transporter ON public.transport_jobs(transporter_id);
CREATE INDEX idx_transport_jobs_status ON public.transport_jobs(status);
CREATE INDEX idx_transport_jobs_part_request ON public.transport_jobs(part_request_id);

-- Updated_at trigger
CREATE TRIGGER trg_transport_jobs_updated_at
  BEFORE UPDATE ON public.transport_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Transporters table
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to transporters"
  ON public.transporters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Transporters can read own profile"
  ON public.transporters FOR SELECT
  USING (user_id = auth.uid());

-- Transport jobs table
ALTER TABLE public.transport_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to transport_jobs"
  ON public.transport_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Transporters can view own jobs"
  ON public.transport_jobs FOR SELECT
  USING (
    transporter_id IN (
      SELECT id FROM transporters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Transporters can update own jobs"
  ON public.transport_jobs FOR UPDATE
  USING (
    transporter_id IN (
      SELECT id FROM transporters WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. RPC: admin_create_transporter_profile
-- ============================================
CREATE OR REPLACE FUNCTION admin_create_transporter_profile(
  p_new_user_id UUID,
  p_name TEXT,
  p_mobile TEXT,
  p_vehicle_type TEXT DEFAULT 'Bike',
  p_vehicle_number TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role app_role;
BEGIN
  -- 1. Verify caller is ADMIN
  SELECT role INTO v_caller_role
  FROM user_roles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create transporters';
  END IF;

  -- 2. Assign DRIVER role (using existing app_role enum value)
  INSERT INTO user_roles (id, role)
  VALUES (p_new_user_id, 'DRIVER')
  ON CONFLICT (id) DO UPDATE SET role = 'DRIVER';

  -- 3. Create transporter profile
  INSERT INTO transporters (user_id, name, mobile, vehicle_type, vehicle_number, status)
  VALUES (p_new_user_id, p_name, p_mobile, p_vehicle_type, p_vehicle_number, 'ACTIVE');
END;
$$;

-- ============================================
-- 5. Enable Realtime for live tracking
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_jobs;
