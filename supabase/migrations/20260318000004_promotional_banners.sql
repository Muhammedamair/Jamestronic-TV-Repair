-- Create custom types
DO $$ BEGIN
    CREATE TYPE banner_placement AS ENUM ('hero', 'inline', 'popup');
    CREATE TYPE banner_theme AS ENUM ('light', 'dark', 'brand');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create promotional_banners table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    description TEXT,
    button_text VARCHAR(100),
    button_link TEXT,
    image_url TEXT,
    placement banner_placement DEFAULT 'hero',
    theme banner_theme DEFAULT 'brand',
    is_active BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to make it idempotent
DROP POLICY IF EXISTS "Anon can view active banners" ON public.promotional_banners;
-- Allow anonymous users (customers) to read active banners for the landing page
CREATE POLICY "Anon can view active banners"
    ON public.promotional_banners FOR SELECT
    USING (is_active = TRUE);

-- Drop policy if exists 
DROP POLICY IF EXISTS "Service role has full access to banners" ON public.promotional_banners;
-- Service role has full access (for admin panel)
CREATE POLICY "Service role has full access to banners"
    ON public.promotional_banners FOR ALL
    USING (true)
    WITH CHECK (true);
