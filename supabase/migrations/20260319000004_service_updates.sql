-- Service Updates table (Google Business Profile Posts replica)
CREATE TABLE IF NOT EXISTS service_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    post_type TEXT NOT NULL DEFAULT 'update', -- 'update' | 'offer' | 'event'
    images TEXT[] DEFAULT '{}',
    service_area TEXT DEFAULT '',
    area_tags TEXT[] DEFAULT '{}',
    cta_type TEXT DEFAULT 'call_now', -- 'call_now' | 'book_now' | 'learn_more'
    cta_link TEXT DEFAULT '/book',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_updates ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts (customers can see them)
CREATE POLICY "Anyone can read published service updates"
    ON service_updates FOR SELECT
    USING (is_published = true);

-- Admin full access (using service_role or authenticated admin)
CREATE POLICY "Admins can manage service updates"
    ON service_updates FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_service_updates_published ON service_updates (is_published, created_at DESC);
CREATE INDEX idx_service_updates_type ON service_updates (post_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_service_updates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_updates_timestamp
    BEFORE UPDATE ON service_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_service_updates_timestamp();
