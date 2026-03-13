-- ============================================
-- VERSION 2: PHASE 1 RPC ROBUST FIX
-- ============================================

-- Drop the old RPC
DROP FUNCTION IF EXISTS admin_create_dealer_profile(UUID, TEXT, TEXT, TEXT, TEXT);

-- Recreate RPC with explicit internal role validation
CREATE OR REPLACE FUNCTION admin_create_dealer_profile(
  p_new_user_id UUID,
  p_name TEXT,
  p_contact_person TEXT,
  p_mobile TEXT,
  p_address TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role app_role;
BEGIN
  -- 1. Get the role of the caller (the Admin triggering the RPC using their token)
  SELECT role INTO v_caller_role 
  FROM user_roles 
  WHERE id = auth.uid();

  -- 2. Validate they are actually an ADMIN
  IF v_caller_role IS NULL OR v_caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create dealers';
  END IF;

  -- 3. Insert into user_roles
  INSERT INTO user_roles (id, role)
  VALUES (p_new_user_id, 'DEALER')
  ON CONFLICT (id) DO UPDATE SET role = 'DEALER';

  -- 4. Insert into dealers
  INSERT INTO dealers (user_id, name, contact_person, mobile, address, status)
  VALUES (p_new_user_id, p_name, p_contact_person, p_mobile, p_address, 'ACTIVE');
END;
$$;
