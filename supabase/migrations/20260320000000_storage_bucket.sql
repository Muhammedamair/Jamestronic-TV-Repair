insert into storage.buckets (id, name, public) values ('service-updates', 'service-updates', true) on conflict do nothing;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'service-updates' );

DROP POLICY IF EXISTS "Authenticated Users can upload" ON storage.objects;
create policy "Authenticated Users can upload" on storage.objects for insert with check ( bucket_id = 'service-updates' and auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Users can update" ON storage.objects;
create policy "Authenticated Users can update" on storage.objects for update using ( bucket_id = 'service-updates' and auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Users can delete" ON storage.objects;
create policy "Authenticated Users can delete" on storage.objects for delete using ( bucket_id = 'service-updates' and auth.role() = 'authenticated' );
