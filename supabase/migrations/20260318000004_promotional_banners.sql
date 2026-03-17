-- ========================================================
-- Dynamic Landing Page Banners Migration
-- Run this in: https://supabase.com/dashboard/project/dqjzqmwqkljyirftgyau/sql/new
-- ========================================================

-- 1. Create Promotional Banners Table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users (customers) to read active banners for the landing page
CREATE POLICY "Anon can view active banners"
    ON public.promotional_banners FOR SELECT
    USING (is_active = TRUE);

-- Allow authenticated admins to do everything
CREATE POLICY "Admins have full access to banners"
    ON public.promotional_banners FOR ALL
    USING (auth.uid() IS NOT NULL AND auth.role() = 'authenticated');

-- 2. Setup the Storage Bucket for Banner Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can read banner images
CREATE POLICY "Public read access to banners"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'banners');

-- Storage RLS: Only admins can upload/delete banners
CREATE POLICY "Admin full access to banners bucket"
    ON storage.objects FOR ALL
    USING (bucket_id = 'banners' AND auth.uid() IS NOT NULL AND auth.role() = 'authenticated');
