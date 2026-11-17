-- Phase 2 · storage buckets and policies (SPEC §11). Images only, never video.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/webp']),
  ('article-images', 'article-images', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Avatars: public read through the public URL; each user writes only inside "<their id>/".
create policy "Avatar owners read their folder"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatar owners upload to their folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatar owners update their folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatar owners delete from their folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Article images: public read; admins write.
create policy "Admins manage article images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'article-images' and (select private.is_admin()))
  with check (bucket_id = 'article-images' and (select private.is_admin()));
