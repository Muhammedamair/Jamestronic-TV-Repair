CREATE TABLE public.brand_metrics (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce single row
    rating_score text NOT NULL DEFAULT '4.9',
    reviews_count text NOT NULL DEFAULT '268',
    interactions_count text NOT NULL DEFAULT '2.5K+',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert the default metrics immediately
INSERT INTO public.brand_metrics (id, rating_score, reviews_count, interactions_count)
VALUES (1, '4.9', '268', '2.5K+')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.brand_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read metrics
CREATE POLICY "Allow public read access for brand_metrics" 
    ON public.brand_metrics 
    FOR SELECT 
    USING (true);

-- Policy: Only authenticated users can update (handled by application logic)
CREATE POLICY "Allow authenticated to update brand_metrics" 
    ON public.brand_metrics 
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_brand_metrics_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_brand_metrics_modtime
    BEFORE UPDATE ON public.brand_metrics
    FOR EACH ROW
    EXECUTE PROCEDURE update_brand_metrics_modtime();
