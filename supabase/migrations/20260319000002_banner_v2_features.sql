-- ========================================================
-- Banner System V2: CTA, Scheduling, Countdown, Emojis
-- ========================================================

ALTER TABLE public.promotional_banners
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_link TEXT DEFAULT '/book',
  ADD COLUMN IF NOT EXISTS schedule_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS countdown_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emoji_set TEXT[] DEFAULT '{}';
