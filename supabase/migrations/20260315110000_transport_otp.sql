-- ============================================
-- TRANSPORT JOBS: OTP + PROXIMITY COLUMNS
-- ============================================
ALTER TABLE public.transport_jobs 
  ADD COLUMN IF NOT EXISTS pickup_otp TEXT,
  ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS proximity_notified BOOLEAN DEFAULT false;
