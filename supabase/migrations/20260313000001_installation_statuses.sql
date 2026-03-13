-- Add installation-specific statuses to the ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'EN_ROUTE';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'INSTALLED';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAYMENT_COLLECTED';
