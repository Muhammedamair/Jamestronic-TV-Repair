-- Add sender tracking and read receipts to ticket_notes
ALTER TABLE public.ticket_notes 
ADD COLUMN sender_type VARCHAR DEFAULT 'ADMIN',
ADD COLUMN is_read BOOLEAN DEFAULT false;

-- Allow updates to ticket_notes for marking as read
-- Technicians can update notes on their assigned tickets
CREATE POLICY "Technicians can update notes on assigned tickets"
  ON public.ticket_notes FOR UPDATE
  USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.technicians tech ON t.assigned_technician_id = tech.id
      WHERE tech.user_id = auth.uid()
    )
  );
