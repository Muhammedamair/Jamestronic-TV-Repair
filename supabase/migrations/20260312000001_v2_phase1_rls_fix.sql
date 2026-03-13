-- ============================================
-- VERSION 2: PHASE 1 HOTFIX
-- Fixes Infinite Recursion on user_roles
-- ============================================

-- Create a SECURITY DEFINER function to cleanly check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins full access to user_roles" ON user_roles;

-- Recreate policies using the non-recursive function
CREATE POLICY "Admins full access to user_roles" 
  ON user_roles FOR ALL 
  USING ( is_admin() );

-- Fix policies on other tables just to improve performance and prevent nested scans
DROP POLICY IF EXISTS "Admins full access to dealers" ON dealers;
CREATE POLICY "Admins full access to dealers" 
  ON dealers FOR ALL USING ( is_admin() );

DROP POLICY IF EXISTS "Admins full access to part_requests" ON part_requests;
CREATE POLICY "Admins full access to part_requests" 
  ON part_requests FOR ALL USING ( is_admin() );

DROP POLICY IF EXISTS "Admins full access to part_bids" ON part_bids;
CREATE POLICY "Admins full access to part_bids" 
  ON part_bids FOR ALL USING ( is_admin() );
