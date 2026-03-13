-- Add image_urls array column to part_requests
ALTER TABLE public.part_requests
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Add image_urls array column to part_bids
ALTER TABLE public.part_bids
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Create Storage Bucket for procurement images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('procurement-images', 'procurement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the storage bucket
-- Allow public read access to images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'procurement-images' );

-- Allow authenticated users (Admins and Dealers) to upload images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'procurement-images' );

-- Allow users to delete their own uploaded images (optional cleanup)
CREATE POLICY "Users can delete their own uploaded images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'procurement-images' AND auth.uid() = owner );
