-- ============================================
-- VERSION 2: PHASE 3 - WARRANTY TRACKING
-- ============================================

-- Add warranty tracking columns to the tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_expiry_date TIMESTAMPTZ;

-- Create an index to quickly find tickets with active or expiring warranties
CREATE INDEX IF NOT EXISTS idx_tickets_warranty_expiry ON tickets(warranty_expiry_date) WHERE warranty_expiry_date IS NOT NULL;
