-- Phase 2 · extensions, the private schema and shared trigger helpers (SPEC §11).
-- Security-definer helpers live in `private`, which PostgREST does not expose.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
-- RLS policies call private.* helpers as the requesting role, so those roles need USAGE.
grant usage on schema private to anon, authenticated, service_role;

-- Functions are executable by PUBLIC by default; every function below opts in explicitly.
alter default privileges in schema private revoke execute on functions from public;

-- updated_at maintenance for tables that carry it.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current statement comes from an API user (anon/authenticated), not from a
-- security-definer trigger, the service role or a migration. Guards use it to let internal
-- bookkeeping (scores, counters) through while still checking what users change directly.
create or replace function private.is_api_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

grant execute on function private.is_api_user() to anon, authenticated, service_role;
