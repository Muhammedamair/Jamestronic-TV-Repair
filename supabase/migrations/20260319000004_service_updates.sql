CREATE TABLE IF NOT EXISTS service_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    post_type VARCHAR(50) DEFAULT 'update',
    images TEXT[] DEFAULT '{}',
    service_area VARCHAR(100),
    area_tags TEXT[] DEFAULT '{}',
    cta_type VARCHAR(50) DEFAULT 'call_now',
    cta_link TEXT DEFAULT '/book',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published service updates" ON service_updates;
CREATE POLICY "Anyone can read published service updates"
    ON service_updates FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Service role can manage service updates" ON service_updates;
CREATE POLICY "Service role can manage service updates"
    ON service_updates FOR ALL
    USING (true)
    WITH CHECK (true);
