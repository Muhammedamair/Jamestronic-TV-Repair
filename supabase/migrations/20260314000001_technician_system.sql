-- ============================================
-- TECHNICIAN SYSTEM MIGRATION
-- Tables, columns, RPC, RLS, indexes
-- ============================================

-- ============================================
-- 1. TECHNICIANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  specialization TEXT DEFAULT 'All',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_technicians_user_id ON public.technicians(user_id);
CREATE INDEX idx_technicians_status ON public.technicians(status);

-- Updated_at trigger
CREATE TRIGGER trg_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. ADD assigned_technician_id TO tickets
-- ============================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.technicians(id);

CREATE INDEX idx_tickets_assigned_technician ON public.tickets(assigned_technician_id);

-- ============================================
-- 3. TICKET TECHNICIAN LOG (performance tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ticket_technician_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tech_status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (tech_status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','CANT_REPAIR','PART_REQUIRED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ttl_ticket ON public.ticket_technician_log(ticket_id);
CREATE INDEX idx_ttl_technician ON public.ticket_technician_log(technician_id);
CREATE INDEX idx_ttl_status ON public.ticket_technician_log(tech_status);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Technicians table
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to technicians"
  ON public.technicians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Technicians can read own profile"
  ON public.technicians FOR SELECT
  USING (user_id = auth.uid());

-- Ticket technician log
ALTER TABLE public.ticket_technician_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_technician_log"
  ON public.ticket_technician_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Technicians can read own logs"
  ON public.ticket_technician_log FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can update own logs"
  ON public.ticket_technician_log FOR UPDATE
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

-- Tickets: Let technicians SELECT their assigned tickets
CREATE POLICY "Technicians can read assigned tickets"
  ON public.tickets FOR SELECT
  USING (
    assigned_technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

-- Tickets: Let technicians UPDATE status on their assigned tickets
CREATE POLICY "Technicians can update assigned tickets"
  ON public.tickets FOR UPDATE
  USING (
    assigned_technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

-- Part requests: Let technicians create part requests
CREATE POLICY "Technicians can create part requests"
  ON public.part_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'TECHNICIAN'
    )
  );

-- Part requests: Let technicians read part requests for their tickets
CREATE POLICY "Technicians can read own part requests"
  ON public.part_requests FOR SELECT
  USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.technicians tech ON t.assigned_technician_id = tech.id
      WHERE tech.user_id = auth.uid()
    )
  );

-- Ticket notes: Let technicians create and read notes on their assigned tickets
CREATE POLICY "Technicians can read notes on assigned tickets"
  ON public.ticket_notes FOR SELECT
  USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.technicians tech ON t.assigned_technician_id = tech.id
      WHERE tech.user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can create notes on assigned tickets"
  ON public.ticket_notes FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.technicians tech ON t.assigned_technician_id = tech.id
      WHERE tech.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. RPC: admin_create_technician_profile
-- ============================================
CREATE OR REPLACE FUNCTION admin_create_technician_profile(
  p_new_user_id UUID,
  p_name TEXT,
  p_mobile TEXT,
  p_specialization TEXT DEFAULT 'All'
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
    RAISE EXCEPTION 'Unauthorized: Only admins can create technicians';
  END IF;

  -- 2. Assign TECHNICIAN role
  INSERT INTO user_roles (id, role)
  VALUES (p_new_user_id, 'TECHNICIAN')
  ON CONFLICT (id) DO UPDATE SET role = 'TECHNICIAN';

  -- 3. Create technician profile
  INSERT INTO technicians (user_id, name, mobile, specialization, status)
  VALUES (p_new_user_id, p_name, p_mobile, p_specialization, 'ACTIVE');
END;
$$;
