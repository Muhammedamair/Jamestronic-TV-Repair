-- Enable real-time subscriptions for ticket notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_notes;
