-- Add time_slot column for tracking preferred installation/service times
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS time_slot TEXT;
