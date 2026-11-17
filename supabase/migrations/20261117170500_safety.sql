-- Phase 2 · reports and the moderation audit log (SPEC §5 safety, §11). Phase 6 builds the queue.

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('thread', 'post', 'clip', 'profile', 'article', 'dmca')),
  target_id text not null check (char_length(target_id) between 1 and 200),
  reason text not null check (reason in (
    'spam', 'harassment', 'hate', 'sexual', 'spoiler', 'cheating', 'leak', 'impersonation', 'copyright', 'other'
  )),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_open_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id);

revoke insert, update on public.reports from anon, authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;
grant update (status, resolved_by, resolved_at) on public.reports to authenticated;

alter table public.reports enable row level security;

create policy "Active users report as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_active_user()) and status = 'open');

create policy "Mods read reports"
  on public.reports for select
  to authenticated
  using ((select private.is_mod()));

create policy "Mods resolve reports"
  on public.reports for update
  to authenticated
  using ((select private.is_mod()))
  with check ((select private.is_mod()));

-- ─── Moderation audit log (append-only) ─────────────────────────────────────
create table public.moderation_actions (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_type text not null check (actor_type in ('human', 'ai')),
  action text not null check (char_length(action) between 1 and 60),
  target_type text not null,
  target_id text not null,
  labels text[] not null default '{}',
  reason text,
  created_at timestamptz not null default now()
);

create index moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);

revoke update, delete, truncate on public.moderation_actions from anon, authenticated;

alter table public.moderation_actions enable row level security;

create policy "Mods read the audit log"
  on public.moderation_actions for select
  to authenticated
  using ((select private.is_mod()));

create policy "Mods log their own actions"
  on public.moderation_actions for insert
  to authenticated
  with check ((select private.is_mod()) and actor_id = (select auth.uid()) and actor_type = 'human');
