-- Phase 2 · fixes from the Supabase security and performance advisors.

-- 1. One permissive policy per action: admin write policies no longer also cover SELECT.
drop policy "Admins manage forum categories" on public.forum_categories;
drop policy "Admins manage reserved usernames" on public.reserved_usernames;
drop policy "Admins manage site settings" on public.site_settings;
drop policy "Admins manage tags" on public.tags;

do $$
declare
  t text;
begin
  foreach t in array array['forum_categories', 'reserved_usernames', 'site_settings', 'tags'] loop
    execute format(
      'create policy "Admins insert %1$s" on public.%1$I for insert to authenticated with check ((select private.is_admin()))', t);
    execute format(
      'create policy "Admins update %1$s" on public.%1$I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format(
      'create policy "Admins delete %1$s" on public.%1$I for delete to authenticated using ((select private.is_admin()))', t);
  end loop;
end;
$$;

-- 2. Cover the accepted-answer foreign key.
create index threads_accepted_post_idx on public.threads (accepted_post_id) where accepted_post_id is not null;

-- 3. Retrieval runs on the server only (Ask AI, Phase 8, through src/server/admin): the knowledge
--    base can't be scraped through the public API (D-042).
revoke execute on function public.match_chunks(extensions.vector, int, boolean) from anon, authenticated;
revoke execute on function public.search_chunks_fts(text, int, boolean) from anon, authenticated;
