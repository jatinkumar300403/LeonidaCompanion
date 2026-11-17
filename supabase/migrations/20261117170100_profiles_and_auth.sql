-- Phase 2 · profiles, usernames, roles, tags and the sign-up trigger (SPEC §9, §11; D-038, D-039).

-- ─── Lookup tables ──────────────────────────────────────────────────────────
create table public.reserved_usernames (
  name extensions.citext primary key
);

create table public.tags (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  label text not null check (char_length(label) between 1 and 40),
  sort_order int not null default 0
);

-- Owner emails that become admin when their profile exists (filled by scripts/seed-admin.mjs).
create table private.seed_admins (
  email extensions.citext primary key,
  created_at timestamptz not null default now()
);
alter table private.seed_admins enable row level security;

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- A profile row exists only once onboarding is complete (username, 16+, terms).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  bio text check (bio is null or char_length(bio) <= 280),
  platform text check (platform in ('ps5', 'xbox', 'both')),
  role text not null default 'user' check (role in ('user', 'mod', 'admin')),
  reputation int not null default 0,
  is_banned boolean not null default false,
  banned_until timestamptz,
  age_confirmed_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  notify_email_replies boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username::text ~ '^[a-z0-9_]{3,20}$')
);

create index profiles_username_trgm on public.profiles using gin ((username::text) extensions.gin_trgm_ops);
create index profiles_role_idx on public.profiles (role) where role <> 'user';

-- ─── Role helpers (used by RLS policies everywhere) ─────────────────────────
-- A ban is active while is_banned is set and banned_until is empty (permanent) or in the future.
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and not (p.is_banned and (p.banned_until is null or p.banned_until > now()))
  );
$$;

create or replace function private.is_mod()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('mod', 'admin')
      and not (p.is_banned and (p.banned_until is null or p.banned_until > now()))
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and not (p.is_banned and (p.banned_until is null or p.banned_until > now()))
  );
$$;

grant execute on function private.is_active_user() to anon, authenticated, service_role;
grant execute on function private.is_mod() to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- ─── Profile guard ──────────────────────────────────────────────────────────
-- Normalises and checks usernames, promotes seed admins on insert, and stops banned users
-- from changing public profile text. The guard runs as the caller (so is_api_user() sees who
-- made the change); the lookups it needs are security-definer helpers.
create or replace function private.is_seed_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.seed_admins s
    join auth.users u on lower(u.email) = lower(s.email::text)
    where u.id = p_user_id
  );
$$;

create or replace function private.is_reserved_username(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.reserved_usernames r where lower(r.name::text) = lower(p_name));
$$;

grant execute on function private.is_seed_admin(uuid) to authenticated, service_role;
grant execute on function private.is_reserved_username(text) to anon, authenticated, service_role;

create or replace function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.username := lower(new.username::text);

  if tg_op = 'INSERT' or new.username::text is distinct from old.username::text then
    if private.is_reserved_username(new.username::text) then
      raise exception 'username_reserved' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if private.is_seed_admin(new.id) then
      new.role := 'admin';
    end if;
    return new;
  end if;

  if private.is_api_user()
     and old.is_banned and (old.banned_until is null or old.banned_until > now())
     and (new.bio is distinct from old.bio
          or new.display_name is distinct from old.display_name
          or new.avatar_url is distinct from old.avatar_url) then
    raise exception 'account_banned' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function private.profiles_guard();

-- ─── Sign-up trigger (SPEC §11 handle_new_user) ─────────────────────────────
-- Creates the profile straight away only when sign-up metadata already carries a valid
-- username plus the age and terms confirmations (e.g. a future native app). Otherwise the user
-- completes /onboarding. It never raises: a bad value must not block sign-up.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text;
begin
  begin
    uname := lower(meta ->> 'username');
    if uname is null
       or uname !~ '^[a-z0-9_]{3,20}$'
       or coalesce((meta ->> 'age_confirmed')::boolean, false) is not true
       or coalesce((meta ->> 'terms_accepted')::boolean, false) is not true then
      return new;
    end if;

    insert into public.profiles (id, username, display_name, platform, age_confirmed_at, terms_accepted_at)
    values (
      new.id,
      uname,
      nullif(left(btrim(meta ->> 'display_name'), 40), ''),
      case when meta ->> 'platform' in ('ps5', 'xbox', 'both') then meta ->> 'platform' end,
      now(),
      now()
    )
    on conflict do nothing;
  exception when others then
    return new;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ─── Public view and the owner's private columns ────────────────────────────
create view public.public_profiles
with (security_invoker = true) as
select id, username, display_name, avatar_url, bio, platform, role, reputation, created_at
from public.profiles;

-- The signed-in user's own row, including the columns other people can't read.
create or replace function public.get_my_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  platform text,
  role text,
  reputation int,
  is_banned boolean,
  banned_until timestamptz,
  age_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  notify_email_replies boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, p.bio, p.platform, p.role, p.reputation,
         p.is_banned, p.banned_until, p.age_confirmed_at, p.terms_accepted_at, p.notify_email_replies, p.created_at
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated, service_role;

-- Seed-admin bridge: stores the owner's email and promotes the profile if it already exists.
-- Returns true when that account is now an admin. Service role only (scripts/seed-admin.mjs).
create or replace function public.set_seed_admin(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  insert into private.seed_admins (email) values (lower(p_email)) on conflict do nothing;

  update public.profiles p
  set role = 'admin'
  from auth.users u
  where p.id = u.id and lower(u.email) = lower(p_email) and p.role <> 'admin';

  return exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where lower(u.email) = lower(p_email) and p.role = 'admin'
  );
end;
$$;

revoke execute on function public.set_seed_admin(text) from public, anon, authenticated;
grant execute on function public.set_seed_admin(text) to service_role;

-- ─── Privileges and RLS ─────────────────────────────────────────────────────
-- Column-level grants keep private columns (ban state, age/terms timestamps, email prefs)
-- unreadable and stop users setting their own role or reputation (D-039).
revoke all on table public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, bio, platform, role, reputation, created_at)
  on public.profiles to anon, authenticated;
grant insert (id, username, display_name, platform, age_confirmed_at, terms_accepted_at)
  on public.profiles to authenticated;
grant update (display_name, avatar_url, bio, platform, notify_email_replies)
  on public.profiles to authenticated;

revoke all on table public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users create their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter table public.reserved_usernames enable row level security;
create policy "Reserved usernames are public"
  on public.reserved_usernames for select
  to anon, authenticated
  using (true);
create policy "Admins manage reserved usernames"
  on public.reserved_usernames for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter table public.tags enable row level security;
create policy "Tags are public"
  on public.tags for select
  to anon, authenticated
  using (true);
create policy "Admins manage tags"
  on public.tags for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
