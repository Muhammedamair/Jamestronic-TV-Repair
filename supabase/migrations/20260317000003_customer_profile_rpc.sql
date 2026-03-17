-- ========================================================
-- GET CUSTOMER PROFILE RPC
-- Used by Account page and Booking page for session-aware auto-fill
-- ========================================================

CREATE OR REPLACE FUNCTION get_customer_profile(p_session_token UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_profile json;
BEGIN
    -- Validate session
    SELECT customer_id INTO v_customer_id FROM public.customer_sessions
    WHERE token = p_session_token AND expires_at > NOW() LIMIT 1;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    -- Build profile
    SELECT json_build_object(
        'name', c.name,
        'mobile', c.mobile,
        'address', c.address,
        'total_bookings', (SELECT count(*) FROM public.tickets WHERE customer_id = c.id)
    ) INTO v_profile
    FROM public.customers c
    WHERE c.id = v_customer_id;

    RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_profile TO anon;
GRANT EXECUTE ON FUNCTION get_customer_profile TO authenticated;
