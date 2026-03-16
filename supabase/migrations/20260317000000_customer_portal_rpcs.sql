-- ========================================================
-- CUSTOMER PORTAL SECURE RPCs
-- ========================================================

-- 1. Secure Booking Creation
CREATE OR REPLACE FUNCTION create_customer_booking(
  p_name TEXT,
  p_mobile TEXT,
  p_address TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_tv_brand TEXT,
  p_tv_model TEXT,
  p_tv_size TEXT,
  p_issue_description TEXT,
  p_service_type TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_ticket_number TEXT;
  v_count INT;
  v_date_str TEXT;
BEGIN
  -- 1. Find or create customer
  SELECT id INTO v_customer_id FROM public.customers WHERE mobile = p_mobile LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, mobile, address)
    VALUES (p_name, p_mobile, p_address)
    RETURNING id INTO v_customer_id;
  END IF;

  -- 2. Generate ticket number
  v_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT count(*) INTO v_count FROM public.tickets WHERE ticket_number LIKE 'JT-' || v_date_str || '%';
  v_ticket_number := 'JT-' || v_date_str || lpad((v_count + 1)::text, 3, '0');

  -- 3. Create ticket
  INSERT INTO public.tickets (
    ticket_number, customer_id, customer_name, customer_mobile, customer_address,
    customer_lat, customer_lng, tv_brand, tv_model, tv_size, issue_description,
    service_type, status, source
  ) VALUES (
    v_ticket_number, v_customer_id, p_name, p_mobile, p_address,
    p_lat, p_lng, p_tv_brand, p_tv_model, p_tv_size, p_issue_description,
    p_service_type, 'OPEN', 'CUSTOMER_PORTAL'
  );

  RETURN v_ticket_number;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION create_customer_booking TO anon;
GRANT EXECUTE ON FUNCTION create_customer_booking TO authenticated;


-- 2. Secure Tracking Fetch (No PII exposed)
CREATE OR REPLACE FUNCTION get_ticket_tracking(p_ticket_number TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  SELECT id, ticket_number, status, tv_brand, service_type, created_at 
  INTO v_ticket
  FROM public.tickets 
  WHERE ticket_number = p_ticket_number;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(v_ticket);
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_ticket_tracking TO anon;
GRANT EXECUTE ON FUNCTION get_ticket_tracking TO authenticated;
