-- ============================================
-- VERSION 2: PHASE 1 RPC HOTFIX
-- Centralize profile creation to avoid RLS loop issues
-- ============================================

-- Create an RPC to safely insert Dealer profiles bypassing RLS correctly as an Admin
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
BEGIN
  -- 1. Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create dealers';
  END IF;

  -- 2. Insert into user_roles
  INSERT INTO user_roles (id, role)
  VALUES (p_new_user_id, 'DEALER')
  ON CONFLICT (id) DO UPDATE SET role = 'DEALER';

  -- 3. Insert into dealers
  INSERT INTO dealers (user_id, name, contact_person, mobile, address, status)
  VALUES (p_new_user_id, p_name, p_contact_person, p_mobile, p_address, 'ACTIVE');
END;
$$;
