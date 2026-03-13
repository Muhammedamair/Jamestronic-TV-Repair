-- Enable the pg_net extension if it's not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Assuming pg_cron is already enabled by Supabase internally, we just schedule a job
-- Note: You might need to adjust the Supabase URL and project ref below

-- 1. First, check if a previous job exists and remove it to avoid duplicates
SELECT cron.unschedule('check-warranty-expiry-daily');

-- 2. Schedule the job to run every day at 10:00 AM UTC
-- Adjust the SUPABASE_URL and SERVICE_ROLE_KEY to match your project variables!
SELECT cron.schedule(
    'check-warranty-expiry-daily',           -- Name of the cron job
    '0 10 * * *',                            -- Cron expression: Every day at 10:00 AM UTC
    $$
        SELECT
            net.http_post(
                url:='https://dqjzqmwqkljyirftgyau.supabase.co/functions/v1/check-warranty-expiry',
                headers:='{"Content-Type": "application/json", "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxanpxbXdxa2xqeWlyZnRneWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3ODc5MiwiZXhwIjoyMDg4NjU0NzkyfQ.-UiiE8e_moJmrIkGEczfuG8v9evXBioEVJNj9M5bwMI"}'::jsonb,
                body:='{}'::jsonb
            ) as request_id;
    $$
);

-- Check scheduled jobs:
-- SELECT * FROM cron.job;

-- To view logs of past runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
