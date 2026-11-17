-- Phase 2 · articles, article feedback and site settings (SPEC §4, §11).

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('tip', 'feature', 'fact', 'online', 'launch', 'guide')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (char_length(summary) <= 160),
  body_md text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  spoiler_level text not null default 'none' check (spoiler_level in ('none', 'minor', 'major')),
  fact_status text check (fact_status in ('confirmed', 'verified', 'community')),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  helpful_up int not null default 0,
  helpful_down int not null default 0,
  view_count int not null default 0,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
    || setweight(to_tsvector('english', coalesce(body_md, '')), 'C')
  ) stored,
  unique (type, slug),
  -- CLAUDE.md rule 7: a published fact carries a status, and a confirmed one an official source.
  constraint articles_published_fact_status check (type <> 'fact' or status <> 'published' or fact_status is not null),
  constraint articles_confirmed_needs_source check (
    fact_status is distinct from 'confirmed' or status <> 'published' or jsonb_array_length(sources) > 0
  )
);

create index articles_search_idx on public.articles using gin (search);
create index articles_title_trgm on public.articles using gin (title extensions.gin_trgm_ops);
create index articles_tags_idx on public.articles using gin (tags);
create index articles_listing_idx on public.articles (type, status, published_at desc);
create index articles_author_idx on public.articles (author_id);

create trigger articles_touch_updated_at
  before update on public.articles
  for each row execute function private.touch_updated_at();

alter table public.articles enable row level security;

create policy "Published articles are public; staff see drafts"
  on public.articles for select
  to anon, authenticated
  using ((status = 'published' and published_at <= now()) or (select private.is_mod()));

create policy "Admins insert articles"
  on public.articles for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins update articles"
  on public.articles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins delete articles"
  on public.articles for delete
  to authenticated
  using ((select private.is_admin()));

-- ─── "Was this helpful?" ────────────────────────────────────────────────────
-- voter_key = the user's id, or a salted hash of an anonymous id (anonymous votes are written
-- by the server with the service role in Phase 3).
create table public.article_feedback (
  article_id uuid not null references public.articles (id) on delete cascade,
  voter_key text not null check (char_length(voter_key) between 8 and 128),
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (article_id, voter_key)
);

create or replace function private.article_feedback_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.article_id, old.article_id);
  up_delta int := (case when tg_op <> 'DELETE' and new.value = 1 then 1 else 0 end)
                - (case when tg_op <> 'INSERT' and old.value = 1 then 1 else 0 end);
  down_delta int := (case when tg_op <> 'DELETE' and new.value = -1 then 1 else 0 end)
                  - (case when tg_op <> 'INSERT' and old.value = -1 then 1 else 0 end);
begin
  update public.articles
  set helpful_up = greatest(helpful_up + up_delta, 0),
      helpful_down = greatest(helpful_down + down_delta, 0)
  where id = target;
  return null;
end;
$$;

create trigger article_feedback_counts
  after insert or update or delete on public.article_feedback
  for each row execute function private.article_feedback_counts();

alter table public.article_feedback enable row level security;

create policy "Users see their own feedback"
  on public.article_feedback for select
  to authenticated
  using (voter_key = (select auth.uid())::text);

create policy "Users leave their own feedback"
  on public.article_feedback for insert
  to authenticated
  with check (
    voter_key = (select auth.uid())::text
    and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );

create policy "Users change their own feedback"
  on public.article_feedback for update
  to authenticated
  using (voter_key = (select auth.uid())::text)
  with check (voter_key = (select auth.uid())::text);

create policy "Users remove their own feedback"
  on public.article_feedback for delete
  to authenticated
  using (voter_key = (select auth.uid())::text);

-- ─── Site settings (feature flags, launch facts; D-018) ─────────────────────
-- Everything here is public: never store a secret in site_settings.
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function private.touch_updated_at();

alter table public.site_settings enable row level security;

create policy "Site settings are public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Admins manage site settings"
  on public.site_settings for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
