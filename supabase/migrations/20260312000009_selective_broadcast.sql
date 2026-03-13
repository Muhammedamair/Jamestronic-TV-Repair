-- Add target_dealer_ids column to part_requests
-- When NULL, the request is broadcast to ALL dealers (default behavior)
-- When populated, only those specific dealers can see the request
ALTER TABLE public.part_requests 
  ADD COLUMN IF NOT EXISTS target_dealer_ids uuid[] DEFAULT NULL;

-- Update the RLS policy for dealers to respect targeting
DROP POLICY IF EXISTS "Dealers can view open or assigned requests" ON part_requests;
DROP POLICY IF EXISTS "Dealers can view open, assigned, or bidded requests" ON part_requests;

CREATE POLICY "Dealers can view targeted or bidded requests" 
  ON part_requests FOR SELECT 
  USING (
    -- OPEN requests: visible if no targeting (broadcast to all) OR dealer is in the target list
    (
      status = 'OPEN' 
      AND (
        target_dealer_ids IS NULL 
        OR (SELECT id FROM dealers WHERE user_id = auth.uid()) = ANY(target_dealer_ids)
      )
    )
    -- Assigned requests: dealer was chosen
    OR assigned_dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
    -- Historical: dealer placed a bid on this request  
    OR id IN (
      SELECT request_id 
      FROM part_bids 
      WHERE dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
    )
  );
