-- Enable Supabase Realtime on procurement tables
-- Without this, client-side Realtime subscriptions won't receive any events

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.part_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.part_bids;

-- Also enable for tickets table (useful for dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
