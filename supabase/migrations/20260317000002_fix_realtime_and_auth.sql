-- ========================================================
-- FIX: Customer Auth RPCs + Realtime for Tickets
-- Run this in: https://supabase.com/dashboard/project/dqjzqmwqkljyirftgyau/sql/new
-- ========================================================

-- ═══ PART 1: Customer OTP Tables ═══
CREATE TABLE IF NOT EXISTS public.customer_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_customer_otps_mobile ON public.customer_otps(mobile);

CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_sessions_token ON public.customer_sessions(token);


-- ═══ PART 2: Request OTP RPC ═══
CREATE OR REPLACE FUNCTION request_customer_otp(p_mobile TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_otp TEXT;
    v_customer_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE mobile = p_mobile) INTO v_customer_exists;
    IF NOT v_customer_exists THEN
        RAISE EXCEPTION 'No account found with this mobile number. Please book a service first.';
    END IF;
    v_otp := '123456'; -- Hardcoded for dev/testing
    UPDATE public.customer_otps SET used = TRUE WHERE mobile = p_mobile AND used = FALSE;
    INSERT INTO public.customer_otps (mobile, otp, expires_at)
    VALUES (p_mobile, v_otp, NOW() + INTERVAL '10 minutes');
    RETURN v_otp;
END;
$$;
GRANT EXECUTE ON FUNCTION request_customer_otp TO anon;
GRANT EXECUTE ON FUNCTION request_customer_otp TO authenticated;


-- ═══ PART 3: Verify OTP RPC ═══
CREATE OR REPLACE FUNCTION verify_customer_otp(p_mobile TEXT, p_otp TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_otp_record RECORD;
    v_token UUID;
BEGIN
    SELECT * INTO v_otp_record FROM public.customer_otps
    WHERE mobile = p_mobile AND otp = p_otp AND used = FALSE AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired OTP';
    END IF;
    UPDATE public.customer_otps SET used = TRUE WHERE id = v_otp_record.id;
    SELECT id INTO v_customer_id FROM public.customers WHERE mobile = p_mobile LIMIT 1;
    v_token := gen_random_uuid();
    INSERT INTO public.customer_sessions (customer_id, token, expires_at)
    VALUES (v_customer_id, v_token, NOW() + INTERVAL '30 days');
    RETURN v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION verify_customer_otp TO anon;
GRANT EXECUTE ON FUNCTION verify_customer_otp TO authenticated;


-- ═══ PART 4: Get Customer Tickets RPC ═══
CREATE OR REPLACE FUNCTION get_customer_tickets(p_session_token UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_tickets json;
BEGIN
    SELECT customer_id INTO v_customer_id FROM public.customer_sessions
    WHERE token = p_session_token AND expires_at > NOW() LIMIT 1;
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tickets
    FROM (
        SELECT id, ticket_number, status, tv_brand, service_type, created_at
        FROM public.tickets WHERE customer_id = v_customer_id ORDER BY created_at DESC
    ) t;
    RETURN v_tickets;
END;
$$;
GRANT EXECUTE ON FUNCTION get_customer_tickets TO anon;
GRANT EXECUTE ON FUNCTION get_customer_tickets TO authenticated;


-- ═══ PART 5: Revoke Session RPC ═══
CREATE OR REPLACE FUNCTION revoke_customer_session(p_session_token UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.customer_sessions WHERE token = p_session_token;
$$;
GRANT EXECUTE ON FUNCTION revoke_customer_session TO anon;
GRANT EXECUTE ON FUNCTION revoke_customer_session TO authenticated;


-- ═══ PART 6: Enable Realtime for Tickets (Admin Live Updates) ═══
-- Set REPLICA IDENTITY FULL so Supabase Realtime sends complete row data
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- Ensure the tickets table is in the realtime publication
-- (This may already exist, so we use a DO block to handle errors)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
EXCEPTION WHEN duplicate_object THEN
    -- Already in publication, ignore
    NULL;
END;
$$;

-- ═══ PART 7: RLS Policy for Tickets (Allow Authenticated Users to Read) ═══
-- Admin users need SELECT access for realtime subscriptions to work
DO $$
BEGIN
    CREATE POLICY "Authenticated users can read tickets"
      ON public.tickets FOR SELECT
      USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;
