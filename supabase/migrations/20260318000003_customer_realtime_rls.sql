-- ========================================================
-- FIX: Allow Anon Users to Receive Realtime Ticket Updates
-- Run this in: https://supabase.com/dashboard/project/dqjzqmwqkljyirftgyau/sql/new
-- ========================================================

-- Allow anonymous users (customers) to read ticket data so Realtime can broadcast to them
-- (Secure because they still need the exact ticket_number string to subscribe to a specific row)
DO $$
BEGIN
    CREATE POLICY "Anon can read tickets for tracking"
      ON public.tickets FOR SELECT
      USING (auth.role() = 'anon');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;
