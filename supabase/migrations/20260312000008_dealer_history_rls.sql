-- Update RLS policy so dealers can see requests they bid on (for historical tracking)
DROP POLICY IF EXISTS "Dealers can view open or assigned requests" ON part_requests;
DROP POLICY IF EXISTS "Dealers can view open, assigned, or bidded requests" ON part_requests;

CREATE POLICY "Dealers can view open, assigned, or bidded requests" 
  ON part_requests FOR SELECT 
  USING (
    status = 'OPEN' 
    OR assigned_dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
    OR id IN (
      SELECT request_id 
      FROM part_bids 
      WHERE dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
    )
  );
