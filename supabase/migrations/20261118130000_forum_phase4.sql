-- Phase 4 · help forum rules (SPEC §5, §9; docs/DECISIONS.md D-061 onward).
-- Phase 2 built the tables, RLS, guards and bookkeeping triggers. This adds what the server code
-- can't enforce on its own, because the API is reachable directly: the 30-minute edit window,
-- new-account limits, links only from trusted accounts, quote replies and their notifications.

-- ─── 1. Columns ─────────────────────────────────────────────────────────────
-- Quote replies remember the post they answer (SPEC §9 "reply to my post").
alter table public.posts add column reply_to_post_id bigint references public.posts (id) on delete set null;
create index posts_reply_to_idx on public.posts (reply_to_post_id) where reply_to_post_id is not null;
grant insert (reply_to_post_id) on public.posts to authenticated;

-- List excerpts without fetching every body (up to 20k characters each).
alter table public.threads add column excerpt text generated always as (left(body_md, 280)) stored;

-- ─── 2. Trust helpers (security definer, always about auth.uid()) ───────────
-- SPEC §5: a new account is in its first 24 h or has reputation < 5. Links need reputation ≥ 20
-- (and, being a new-account rule too, an account at least a day old). Staff are exempt.
create or replace function private.forum_trust()
returns table (is_staff boolean, is_new boolean, can_link boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.role in ('mod', 'admin'),
         p.created_at > now() - interval '24 hours' or p.reputation < 5,
         p.created_at <= now() - interval '24 hours' and p.reputation >= 20
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- Threads or posts the caller wrote in the last 24 hours (any status, so deleting doesn't reset it).
create or replace function private.my_recent_forum_count(p_kind text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case p_kind
    when 'thread' then (
      select count(*)::int from public.threads t
      where t.author_id = (select auth.uid()) and t.created_at > now() - interval '24 hours')
    else (
      select count(*)::int from public.posts p
      where p.author_id = (select auth.uid()) and not p.is_ai and p.created_at > now() - interval '24 hours')
  end;
$$;

-- Anything markdown would render as a link: http(s) URLs, www. autolinks, [text](url),
-- <scheme:…> autolinks and reference definitions. Mirrors containsLink() in src/lib/forum/rules.ts.
create or replace function private.contains_link(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') ~* '(?n)(https?://|www\.|\]\(|<[a-z][a-z0-9+.-]*:|^\s{0,3}\[[^]]+\]:)';
$$;

revoke execute on function private.forum_trust() from public;
revoke execute on function private.my_recent_forum_count(text) from public;
revoke execute on function private.contains_link(text) from public;
grant execute on function private.forum_trust() to authenticated, service_role;
grant execute on function private.my_recent_forum_count(text) to authenticated, service_role;
grant execute on function private.contains_link(text) to authenticated, service_role;

-- ─── 3. Insert guards (run as the caller) ───────────────────────────────────
create or replace function private.threads_insert_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  trust record;
begin
  if not private.is_api_user() then
    return new;
  end if;
  select * into trust from private.forum_trust();
  if not found or trust.is_staff then
    return new;
  end if;

  if trust.is_new and private.my_recent_forum_count('thread') >= 3 then
    raise exception 'new_account_thread_limit' using errcode = '42501';
  end if;
  if not trust.can_link and private.contains_link(new.title || ' ' || new.body_md) then
    raise exception 'links_need_reputation' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger threads_insert_guard
  before insert on public.threads
  for each row execute function private.threads_insert_guard();

create or replace function private.posts_insert_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  trust record;
begin
  if new.reply_to_post_id is not null and not exists (
    select 1 from public.posts p where p.id = new.reply_to_post_id and p.thread_id = new.thread_id
  ) then
    raise exception 'invalid_reply_target' using errcode = '23514';
  end if;

  if not private.is_api_user() then
    return new;
  end if;
  select * into trust from private.forum_trust();
  if not found or trust.is_staff then
    return new;
  end if;

  if trust.is_new and private.my_recent_forum_count('post') >= 20 then
    raise exception 'new_account_post_limit' using errcode = '42501';
  end if;
  if not trust.can_link and private.contains_link(new.body_md) then
    raise exception 'links_need_reputation' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger posts_insert_guard
  before insert on public.posts
  for each row execute function private.posts_insert_guard();

-- ─── 4. Update guards: the 30-minute edit window and links on edit ──────────
-- Unchanged from Phase 2 except: non-mods edit title, body, tags or the spoiler flag only within
-- 30 minutes of posting, edits can't add links without trust, and a thread author may soft-delete
-- (body → "[deleted]") at any time.
create or replace function private.threads_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mod boolean;
  content_changed boolean;
  soft_delete boolean;
begin
  if not private.is_api_user() then
    return new;
  end if;
  mod := private.is_mod();

  if new.accepted_post_id is distinct from old.accepted_post_id and new.accepted_post_id is not null then
    if not exists (
      select 1 from public.posts p
      where p.id = new.accepted_post_id and p.thread_id = new.id and p.status = 'visible'
    ) then
      raise exception 'invalid_accepted_post' using errcode = '23514';
    end if;
  end if;

  content_changed := new.title is distinct from old.title
    or new.body_md is distinct from old.body_md
    or new.tags is distinct from old.tags
    or new.is_spoiler is distinct from old.is_spoiler;
  soft_delete := new.body_md = '[deleted]' and old.body_md is distinct from '[deleted]'
    and new.title is not distinct from old.title
    and new.tags is not distinct from old.tags
    and new.is_spoiler is not distinct from old.is_spoiler;

  if not mod then
    if old.status in ('removed', 'held', 'locked') then
      raise exception 'thread_not_editable' using errcode = '42501';
    end if;
    if new.category_id is distinct from old.category_id then
      raise exception 'only_mods_move_threads' using errcode = '42501';
    end if;
    if new.accepted_post_id is distinct from old.accepted_post_id then
      new.status := case when new.accepted_post_id is null then 'open' else 'solved' end;
    elsif new.status is distinct from old.status then
      raise exception 'status_change_not_allowed' using errcode = '42501';
    end if;
    if content_changed and not soft_delete then
      if old.created_at < now() - interval '30 minutes' then
        raise exception 'edit_window_closed' using errcode = '42501';
      end if;
      if private.contains_link(new.title || ' ' || new.body_md)
         and not coalesce((select t.can_link from private.forum_trust() t), false) then
        raise exception 'links_need_reputation' using errcode = '42501';
      end if;
    end if;
  elsif new.accepted_post_id is distinct from old.accepted_post_id and new.status in ('open', 'solved') then
    new.status := case when new.accepted_post_id is null then 'open' else 'solved' end;
  end if;

  if new.title is distinct from old.title or new.body_md is distinct from old.body_md then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.posts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_user() then
    return new;
  end if;

  if not private.is_mod() then
    if old.status <> 'visible' then
      raise exception 'post_not_editable' using errcode = '42501';
    end if;
    if new.status not in ('visible', 'deleted') then
      raise exception 'status_change_not_allowed' using errcode = '42501';
    end if;
    if new.status = 'visible' and new.body_md is distinct from old.body_md then
      if old.created_at < now() - interval '30 minutes' then
        raise exception 'edit_window_closed' using errcode = '42501';
      end if;
      if private.contains_link(new.body_md)
         and not coalesce((select t.can_link from private.forum_trust() t), false) then
        raise exception 'links_need_reputation' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status = 'deleted' and old.status <> 'deleted' then
    new.body_md := '[deleted]';
  elsif new.body_md is distinct from old.body_md then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

-- ─── 5. Notifications: mentions, quote replies, one notification per person ─
create or replace function private.notify_mentions(
  p_body text,
  p_actor uuid,
  p_actor_name text,
  p_thread_id bigint,
  p_post_id bigint,
  p_thread_title text,
  p_thread_slug text,
  p_skip uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mention text;
  mentioned uuid;
begin
  for mention in
    select distinct lower(m[1])
    from regexp_matches(coalesce(p_body, ''), '(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})', 'g') as m
    limit 10
  loop
    select p.id into mentioned from public.profiles p where p.username::text = mention;
    if mentioned is not null
       and not (mentioned = any (coalesce(p_skip, '{}'::uuid[])))
       and not private.has_blocked(mentioned, p_actor) then
      insert into public.notifications (user_id, type, payload)
      values (mentioned, 'mention', jsonb_strip_nulls(jsonb_build_object(
        'thread_id', p_thread_id, 'post_id', p_post_id, 'thread_title', p_thread_title,
        'thread_slug', p_thread_slug, 'actor', p_actor_name)));
    end if;
    mentioned := null;
  end loop;
end;
$$;

revoke execute on function private.notify_mentions(text, uuid, text, bigint, bigint, text, text, uuid[]) from public;

-- reply_count counts visible, non-AI posts (D-017). A new visible post notifies, at most once each:
-- the author of the quoted post (post_reply), then the thread author (thread_reply), then mentions.
create or replace function private.posts_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_counted boolean := tg_op <> 'INSERT' and not old.is_ai and old.status = 'visible';
  is_counted boolean := tg_op <> 'DELETE' and not new.is_ai and new.status = 'visible';
  delta int := (case when is_counted then 1 else 0 end) - (case when was_counted then 1 else 0 end);
  thread_author uuid;
  thread_title text;
  thread_slug text;
  actor_name text;
  target_author uuid;
  notified uuid[];
begin
  if delta <> 0 then
    update public.threads
    set reply_count = greatest(reply_count + delta, 0),
        last_activity_at = case when delta > 0 then now() else last_activity_at end
    where id = coalesce(new.thread_id, old.thread_id);
  end if;

  if tg_op = 'INSERT' and new.status = 'visible' and new.author_id is not null then
    select t.author_id, t.title, t.slug into thread_author, thread_title, thread_slug
    from public.threads t where t.id = new.thread_id;
    select p.username::text into actor_name from public.profiles p where p.id = new.author_id;
    notified := array[new.author_id];

    if new.reply_to_post_id is not null then
      select p.author_id into target_author
      from public.posts p where p.id = new.reply_to_post_id and p.status = 'visible';
      if target_author is not null and not (target_author = any (notified)) then
        notified := notified || target_author;
        if not private.has_blocked(target_author, new.author_id) then
          insert into public.notifications (user_id, type, payload)
          values (target_author, 'post_reply', jsonb_build_object(
            'thread_id', new.thread_id, 'post_id', new.id, 'thread_title', thread_title,
            'thread_slug', thread_slug, 'actor', actor_name));
        end if;
      end if;
    end if;

    if thread_author is not null and not (thread_author = any (notified)) then
      notified := notified || thread_author;
      if not private.has_blocked(thread_author, new.author_id) then
        insert into public.notifications (user_id, type, payload)
        values (thread_author, 'thread_reply', jsonb_build_object(
          'thread_id', new.thread_id, 'post_id', new.id, 'thread_title', thread_title,
          'thread_slug', thread_slug, 'actor', actor_name));
      end if;
    end if;

    perform private.notify_mentions(
      new.body_md, new.author_id, actor_name, new.thread_id, new.id, thread_title, thread_slug, notified);
  end if;

  return null;
end;
$$;

-- Mentions in a new thread's question notify too.
create or replace function private.threads_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  if new.status = 'open' and new.author_id is not null then
    select p.username::text into actor_name from public.profiles p where p.id = new.author_id;
    perform private.notify_mentions(
      new.body_md, new.author_id, actor_name, new.id, null, new.title, new.slug, array[new.author_id]);
  end if;
  return null;
end;
$$;

create trigger threads_after_insert
  after insert on public.threads
  for each row execute function private.threads_after_insert();

-- Accepted answers: unchanged, plus the thread slug in the notification payload.
create or replace function private.threads_accepted_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_author uuid;
  new_author uuid;
begin
  if old.accepted_post_id is not null then
    select p.author_id into old_author from public.posts p where p.id = old.accepted_post_id;
    if old_author is not null and old_author is distinct from new.author_id then
      update public.profiles set reputation = reputation - 10 where id = old_author;
    end if;
  end if;

  if new.accepted_post_id is not null then
    select p.author_id into new_author from public.posts p where p.id = new.accepted_post_id;
    if new_author is not null and new_author is distinct from new.author_id then
      update public.profiles set reputation = reputation + 10 where id = new_author;
      insert into public.notifications (user_id, type, payload)
      values (new_author, 'answer_accepted', jsonb_build_object(
        'thread_id', new.id, 'post_id', new.accepted_post_id, 'thread_title', new.title,
        'thread_slug', new.slug));
    end if;
  end if;
  return null;
end;
$$;

-- ─── 6. "Similar threads" while typing a title (SPEC §5 /forum/new) ─────────
-- Trigram match on titles (the existing GIN index), as the caller so RLS hides held/removed rows.
create or replace function public.similar_threads(p_query text, p_limit int default 5)
returns table (id bigint, title text, slug text, status text, reply_count int, similarity real)
language sql
stable
set search_path = ''
set pg_trgm.similarity_threshold = 0.2
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with q as (select left(btrim(coalesce(p_query, '')), 140) as text)
  select t.id, t.title, t.slug, t.status, t.reply_count,
         greatest(
           extensions.similarity(t.title, q.text),
           extensions.word_similarity(q.text, t.title),
           extensions.word_similarity(t.title, q.text)
         )::real as similarity
  from public.threads t, q
  where char_length(q.text) >= 3
    and t.status in ('open', 'solved', 'locked')
    and (
      t.title operator(extensions.%) q.text
      or q.text operator(extensions.<%) t.title
      or q.text operator(extensions.%>) t.title
    )
  order by 6 desc, t.reply_count desc, t.id desc
  limit least(greatest(coalesce(p_limit, 5), 1), 10);
$$;

revoke execute on function public.similar_threads(text, int) from public;
grant execute on function public.similar_threads(text, int) to anon, authenticated, service_role;
