-- Add PENDING_REVIEW to part_request_status ENUM
ALTER TYPE part_request_status ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
