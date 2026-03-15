-- ============================================
-- Allow dealers to read transport_jobs for their pickups
-- Dealers can see transport jobs linked to part_requests
-- where they have an accepted bid
-- ============================================
CREATE POLICY "Dealers can view transport_jobs for their pickups"
  ON public.transport_jobs FOR SELECT
  USING (
    part_request_id IN (
      SELECT pb.request_id FROM part_bids pb
      JOIN dealers d ON d.id = pb.dealer_id
      WHERE d.user_id = auth.uid()
      AND pb.is_accepted = true
    )
  );
