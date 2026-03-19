-- Add layout_style column for different text layout patterns
ALTER TABLE promotional_banners
ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'classic';

-- Valid values: 'classic', 'center', 'offer_first', 'split'
COMMENT ON COLUMN promotional_banners.layout_style IS 'Typography layout style: classic (left-aligned), center (centered), offer_first (price first), split (text+emoji)';
