-- Private buckets. Paths are {user_id}/{uuid}.{ext}. Files are shown through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('wallpapers', 'wallpapers', false, 10485760, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "own folder" on storage.objects for all to authenticated
  using (
    bucket_id in ('receipts', 'documents', 'wallpapers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('receipts', 'documents', 'wallpapers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "mfa when enrolled" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id not in ('receipts', 'documents', 'wallpapers') or (select private.mfa_ok()));
