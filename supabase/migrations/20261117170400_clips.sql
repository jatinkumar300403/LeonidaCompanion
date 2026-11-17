-- Phase 2 · clips and the weekly top 10 (SPEC §6, §11). Embeds only: no video is stored.

create table public.clips (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('twitch', 'youtube', 'tiktok')),
  external_id text not null check (char_length(external_id) between 1 and 200),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  title text not null check (char_length(title) between 1 and 200),
  caption text check (caption is null or char_length(caption) <= 280),
  creator_name text check (creator_name is null or char_length(creator_name) <= 100),
  creator_url text check (creator_url is null or (creator_url ~ '^https://' and char_length(creator_url) <= 500)),
  duration_sec int check (duration_sec is null or duration_sec >= 0),
  thumbnail_url text check (thumbnail_url is null or (thumbnail_url ~ '^https://' and char_length(thumbnail_url) <= 1000)),
  category text not null default 'other' check (category in ('funny', 'epic', 'fail', 'stunt', 'glitch', 'other')),
  source text not null default 'user' check (source in ('user', 'twitch_auto')),
  submitted_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 500),
  score int not null default 0,
  views_on_platform int,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (platform, external_id)
);

create index clips_feed_idx on public.clips (status, approved_at desc);
create index clips_submitter_idx on public.clips (submitted_by);
create index clips_title_trgm on public.clips using gin (title extensions.gin_trgm_ops);

-- Approval bookkeeping: approved_at, +5 reputation (SPEC §5) and the submitter's notification.
create or replace function private.clips_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.clips set approved_at = coalesce(approved_at, now()) where id = new.id and approved_at is null;
    if new.submitted_by is not null then
      update public.profiles set reputation = reputation + 5 where id = new.submitted_by;
      insert into public.notifications (user_id, type, payload)
      values (new.submitted_by, 'clip_approved', jsonb_build_object('clip_id', new.id, 'title', new.title));
    end if;
  elsif old.status = 'approved' and new.status <> 'approved' then
    if new.submitted_by is not null then
      update public.profiles set reputation = reputation - 5 where id = new.submitted_by;
    end if;
  end if;

  if new.status = 'rejected' and old.status = 'pending' and new.submitted_by is not null then
    insert into public.notifications (user_id, type, payload)
    values (new.submitted_by, 'clip_rejected', jsonb_build_object(
      'clip_id', new.id, 'title', new.title, 'reason', new.reject_reason));
  end if;
  return null;
end;
$$;

create trigger clips_status_change
  after update of status on public.clips
  for each row
  when (old.status is distinct from new.status)
  execute function private.clips_status_change();

revoke insert, update on public.clips from anon, authenticated;
grant insert (platform, external_id, url, title, caption, creator_name, creator_url, duration_sec, thumbnail_url,
              category, source, submitted_by, status, views_on_platform)
  on public.clips to authenticated;
grant update (status, reject_reason, category, title, caption) on public.clips to authenticated;

alter table public.clips enable row level security;

create policy "Approved clips are public; submitters and mods see the rest"
  on public.clips for select
  to anon, authenticated
  using (status = 'approved' or submitted_by = (select auth.uid()) or (select private.is_mod()));

create policy "Active users submit clips as themselves"
  on public.clips for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and (select private.is_active_user())
    and source = 'user'
    and status = 'pending'
  );

create policy "Mods review clips"
  on public.clips for update
  to authenticated
  using ((select private.is_mod()))
  with check ((select private.is_mod()));

create policy "Submitters and mods delete clips"
  on public.clips for delete
  to authenticated
  using (submitted_by = (select auth.uid()) or (select private.is_mod()));

-- ─── Weekly top 10 snapshots (written by the weekly-clips cron) ──────────────
create table public.clip_weekly (
  week text primary key check (week ~ '^[0-9]{4}-w[0-9]{2}$'),
  clip_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.clip_weekly enable row level security;
revoke insert, update, delete, truncate on public.clip_weekly from anon, authenticated;

create policy "Weekly clip snapshots are public"
  on public.clip_weekly for select
  to anon, authenticated
  using (true);
