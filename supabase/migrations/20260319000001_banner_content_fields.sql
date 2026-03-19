-- ========================================================
-- Extend Promotional Banners with Content Fields
-- Enables admin-editable banner text, colors, and animations
-- ========================================================

-- Add content columns for admin-editable banner text
ALTER TABLE public.promotional_banners
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS highlight_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tag_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS gradient_start TEXT DEFAULT '#5B4CF2',
  ADD COLUMN IF NOT EXISTS gradient_end TEXT DEFAULT '#7C3AED',
  ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'hero',
  ADD COLUMN IF NOT EXISTS animation_style TEXT DEFAULT 'particles';

-- Make image_url nullable (hero banners use gradient, not images)
ALTER TABLE public.promotional_banners ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.promotional_banners ALTER COLUMN image_url SET DEFAULT '';

-- Insert default hero banner with current hardcoded content
INSERT INTO public.promotional_banners (
  title, subtitle, highlight_text, tag_text, offer_text,
  gradient_start, gradient_end, banner_type, animation_style,
  is_active, order_index, image_url
) VALUES (
  'JamesTronic Care', 'Expert TV Repair at', '₹249*', '10 MINS',
  '* Valid for first 3 bookings • Zero visitation fee',
  '#5B4CF2', '#7C3AED', 'hero', 'particles',
  true, 0, ''
)
ON CONFLICT DO NOTHING;
