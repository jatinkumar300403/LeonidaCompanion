-- Phase 2 · knowledge base, Ask AI logs, ingestion runs and the newsletter (SPEC §7–§9, §11).
-- These tables are written only by the server with the service role. knowledge_chunks is read
-- only through the security-definer retrieval functions below.

create table public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email extensions.citext not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  lists text[] not null default '{digest}',
  confirm_token text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.wiki_pages (
  id bigint generated always as identity primary key,
  source_id text not null,
  page_id bigint not null,
  title text not null,
  url text not null,
  revision_id bigint,
  license text,
  content_text text,
  is_spoiler boolean not null default false,
  fetched_at timestamptz,
  unique (source_id, page_id)
);

create table public.knowledge_chunks (
  id bigint generated always as identity primary key,
  source_type text not null check (source_type in ('article', 'forum_solution', 'wiki')),
  source_ref text not null,
  title text,
  section text,
  url text,
  license text,
  attribution text,
  is_spoiler boolean not null default false,
  chunk_index int not null default 0,
  content text not null,
  embedding extensions.vector(1024),
  tsv tsvector generated always as (to_tsvector('english', content)) stored,
  updated_at timestamptz not null default now()
);

create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index knowledge_chunks_tsv_idx on public.knowledge_chunks using gin (tsv);
create index knowledge_chunks_source_idx on public.knowledge_chunks (source_type, source_ref);

create trigger knowledge_chunks_touch_updated_at
  before update on public.knowledge_chunks
  for each row execute function private.touch_updated_at();

create table public.ask_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  anon_hash text,
  question text not null,
  include_spoilers boolean not null default false,
  chunk_ids bigint[] not null default '{}',
  top_score real,
  answer text,
  model text,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  feedback smallint check (feedback in (-1, 1)),
  created_at timestamptz not null default now()
);

create index ask_logs_created_idx on public.ask_logs (created_at desc);
create index ask_logs_user_idx on public.ask_logs (user_id);

create table public.ingest_runs (
  id bigint generated always as identity primary key,
  source_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  pages_seen int not null default 0,
  pages_changed int not null default 0,
  chunks_upserted int not null default 0,
  errors jsonb not null default '[]'
);

create index ingest_runs_started_idx on public.ingest_runs (source_id, started_at desc);

-- ─── Privileges and RLS ─────────────────────────────────────────────────────
revoke all on table public.newsletter_subscribers, public.wiki_pages, public.knowledge_chunks
  from anon, authenticated;
revoke insert, update, delete, truncate on table public.ask_logs, public.ingest_runs from anon, authenticated;

alter table public.newsletter_subscribers enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.ask_logs enable row level security;
alter table public.ingest_runs enable row level security;

create policy "Admins read Ask AI logs"
  on public.ask_logs for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins read ingestion runs"
  on public.ingest_runs for select
  to authenticated
  using ((select private.is_admin()));

-- ─── Retrieval (SPEC §8.1) ──────────────────────────────────────────────────
create or replace function public.match_chunks(
  query_embedding extensions.vector(1024),
  match_count int default 8,
  include_spoilers boolean default false
)
returns table (
  id bigint,
  source_type text,
  source_ref text,
  title text,
  section text,
  url text,
  license text,
  attribution text,
  is_spoiler boolean,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.source_type, c.source_ref, c.title, c.section, c.url, c.license, c.attribution, c.is_spoiler,
         c.content, 1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.knowledge_chunks c
  where c.embedding is not null
    and (include_spoilers or not c.is_spoiler)
  order by c.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(coalesce(match_count, 8), 1), 50);
$$;

create or replace function public.search_chunks_fts(
  q text,
  match_count int default 8,
  include_spoilers boolean default false
)
returns table (
  id bigint,
  source_type text,
  source_ref text,
  title text,
  section text,
  url text,
  license text,
  attribution text,
  is_spoiler boolean,
  content text,
  rank real
)
language sql
stable
security definer
set search_path = ''
as $$
  with query as (select websearch_to_tsquery('english', coalesce(q, '')) as tsq)
  select c.id, c.source_type, c.source_ref, c.title, c.section, c.url, c.license, c.attribution, c.is_spoiler,
         c.content, ts_rank_cd(c.tsv, query.tsq) as rank
  from public.knowledge_chunks c, query
  where c.tsv @@ query.tsq
    and (include_spoilers or not c.is_spoiler)
  order by rank desc, c.id
  limit least(greatest(coalesce(match_count, 8), 1), 50);
$$;

revoke execute on function public.match_chunks(extensions.vector, int, boolean) from public;
revoke execute on function public.search_chunks_fts(text, int, boolean) from public;
grant execute on function public.match_chunks(extensions.vector, int, boolean) to anon, authenticated, service_role;
grant execute on function public.search_chunks_fts(text, int, boolean) to anon, authenticated, service_role;
