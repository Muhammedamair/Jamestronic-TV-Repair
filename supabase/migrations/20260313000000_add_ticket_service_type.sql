-- Add service_type to tickets to distinguish between REPAIR and INSTALLATION
CREATE TYPE ticket_service_type AS ENUM ('REPAIR', 'INSTALLATION');

-- Add column with default 'REPAIR' so all existing data is handled safely
ALTER TABLE tickets 
ADD COLUMN service_type ticket_service_type NOT NULL DEFAULT 'REPAIR';

-- Add index to help filtering by service type
CREATE INDEX IF NOT EXISTS idx_tickets_service_type ON tickets(service_type);
