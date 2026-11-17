-- Phase 2 · forum: categories, threads, posts, votes, blocks, notifications (SPEC §5, §11).
-- Phase 4 builds the UI and server logic on top (edit window, new-account limits, link rules).

create table public.forum_categories (
  id serial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sort_order int not null default 0,
  is_qa boolean not null default false,
  is_locked boolean not null default false,
  spoilers_allowed boolean not null default false
);

create table public.threads (
  id bigint generated always as identity primary key,
  category_id int not null references public.forum_categories (id),
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 10 and 140),
  slug text not null check (char_length(slug) between 1 and 160),
  body_md text not null check (char_length(body_md) <= 20000),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  is_spoiler boolean not null default false,
  status text not null default 'open' check (status in ('open', 'solved', 'locked', 'removed', 'held')),
  accepted_post_id bigint,
  score int not null default 0,
  reply_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(body_md, '')), 'C')
  ) stored
);

create table public.posts (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body_md text not null check (char_length(body_md) between 1 and 20000),
  is_ai boolean not null default false,
  ai_sources jsonb,
  score int not null default 0,
  status text not null default 'visible' check (status in ('visible', 'removed', 'held', 'deleted')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

alter table public.threads
  add constraint threads_accepted_post_fk foreign key (accepted_post_id) references public.posts (id) on delete set null;

create index threads_category_activity_idx on public.threads (category_id, last_activity_at desc);
create index threads_created_idx on public.threads (created_at desc);
create index threads_author_idx on public.threads (author_id);
create index threads_search_idx on public.threads using gin (search);
create index threads_title_trgm on public.threads using gin (title extensions.gin_trgm_ops);
create index threads_tags_idx on public.threads using gin (tags);
create index posts_thread_idx on public.posts (thread_id, created_at);
create index posts_author_idx on public.posts (author_id);

create table public.votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'post', 'clip')),
  target_id bigint not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index votes_target_idx on public.votes (target_type, target_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'thread_reply', 'post_reply', 'mention', 'answer_accepted', 'clip_approved', 'clip_rejected', 'mod_action', 'admin_alert'
  )),
  payload jsonb not null default '{}',
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function private.can_post_in_category(p_category_id int)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.forum_categories c
    where c.id = p_category_id and (not c.is_locked or private.is_mod())
  );
$$;

-- True when `p_blocker` has blocked `p_blocked` (mentions and notifications respect it).
create or replace function private.has_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks b where b.blocker_id = p_blocker and b.blocked_id = p_blocked);
$$;

grant execute on function private.can_post_in_category(int) to anon, authenticated, service_role;
grant execute on function private.has_blocked(uuid, uuid) to authenticated, service_role;

-- SPEC §5 hot rank: score / (hours_since + 2)^1.5. Mirrors src/lib/forum/hot-rank.ts.
create or replace function public.hot_rank(p_score int, p_created_at timestamptz)
returns double precision
language sql
stable
set search_path = ''
as $$
  select p_score / power(greatest(extract(epoch from (now() - p_created_at)) / 3600.0, 0) + 2, 1.5);
$$;

-- Hot threads for the forum home or one category. Runs as the caller, so RLS applies.
-- `p_cursor` is an offset: hot ranks shift every minute, so keyset cursors would skip rows.
create or replace function public.hot_threads(p_category_id int default null, p_limit int default 20, p_cursor int default 0)
returns setof public.threads
language sql
stable
set search_path = ''
as $$
  select t.*
  from public.threads t
  where t.status in ('open', 'solved', 'locked')
    and (p_category_id is null or t.category_id = p_category_id)
  order by public.hot_rank(t.score, t.created_at) desc, t.created_at desc, t.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_cursor, 0), 0);
$$;

grant execute on function public.hot_rank(int, timestamptz) to anon, authenticated, service_role;
grant execute on function public.hot_threads(int, int, int) to anon, authenticated, service_role;

-- ─── Thread guard (runs as the caller) ──────────────────────────────────────
-- Non-mods can't move threads, change scores or set statuses directly, and can't edit removed,
-- held or locked threads. Accepting an answer flips open ↔ solved. Edits stamp edited_at.
create or replace function private.threads_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mod boolean;
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
  elsif new.accepted_post_id is distinct from old.accepted_post_id and new.status in ('open', 'solved') then
    new.status := case when new.accepted_post_id is null then 'open' else 'solved' end;
  end if;

  if new.title is distinct from old.title or new.body_md is distinct from old.body_md then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger threads_guard
  before update on public.threads
  for each row execute function private.threads_guard();

-- ─── Post guard (runs as the caller) ────────────────────────────────────────
-- Owners may edit a visible post or soft-delete it (status 'deleted' → body "[deleted]").
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
  end if;

  if new.status = 'deleted' and old.status <> 'deleted' then
    new.body_md := '[deleted]';
  elsif new.body_md is distinct from old.body_md then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_guard
  before update on public.posts
  for each row execute function private.posts_guard();

-- ─── Reply counters and notifications (bookkeeping, security definer) ───────
-- reply_count counts visible, non-AI posts (D-017).
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
  actor_name text;
  mention text;
  mentioned uuid;
begin
  if delta <> 0 then
    update public.threads
    set reply_count = greatest(reply_count + delta, 0),
        last_activity_at = case when delta > 0 then now() else last_activity_at end
    where id = coalesce(new.thread_id, old.thread_id);
  end if;

  -- Notify only when a post first becomes visible (insert or approval of a held post).
  if tg_op = 'INSERT' and new.status = 'visible' and new.author_id is not null then
    select t.author_id, t.title into thread_author, thread_title from public.threads t where t.id = new.thread_id;
    select p.username::text into actor_name from public.profiles p where p.id = new.author_id;

    if thread_author is not null and thread_author <> new.author_id
       and not private.has_blocked(thread_author, new.author_id) then
      insert into public.notifications (user_id, type, payload)
      values (thread_author, 'thread_reply', jsonb_build_object(
        'thread_id', new.thread_id, 'post_id', new.id, 'thread_title', thread_title, 'actor', actor_name));
    end if;

    for mention in
      select distinct lower(m[1])
      from regexp_matches(new.body_md, '(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})', 'g') as m
      limit 10
    loop
      select p.id into mentioned from public.profiles p where p.username::text = mention;
      if mentioned is not null and mentioned <> new.author_id
         and mentioned is distinct from thread_author
         and not private.has_blocked(mentioned, new.author_id) then
        insert into public.notifications (user_id, type, payload)
        values (mentioned, 'mention', jsonb_build_object(
          'thread_id', new.thread_id, 'post_id', new.id, 'thread_title', thread_title, 'actor', actor_name));
      end if;
      mentioned := null;
    end loop;
  end if;

  return null;
end;
$$;

create trigger posts_after_change
  after insert or update of status or delete on public.posts
  for each row execute function private.posts_after_change();

-- ─── Accepted answers: reputation ±10 and a notification ────────────────────
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
        'thread_id', new.id, 'post_id', new.accepted_post_id, 'thread_title', new.title));
    end if;
  end if;
  return null;
end;
$$;

create trigger threads_accepted_change
  after update of accepted_post_id on public.threads
  for each row
  when (old.accepted_post_id is distinct from new.accepted_post_id)
  execute function private.threads_accepted_change();

-- ─── Votes: validation (caller) and score/reputation bookkeeping (definer) ──
-- The target must exist and be visible to the voter, and nobody votes on their own content.
create or replace function private.votes_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_author uuid;
  target_exists boolean := false;
begin
  if new.target_type = 'thread' then
    select t.author_id, true into target_author, target_exists from public.threads t where t.id = new.target_id;
  elsif new.target_type = 'post' then
    select p.author_id, true into target_author, target_exists from public.posts p where p.id = new.target_id;
  else
    select c.submitted_by, true into target_author, target_exists from public.clips c where c.id = new.target_id;
  end if;

  if not coalesce(target_exists, false) then
    raise exception 'vote_target_not_found' using errcode = '23503';
  end if;
  if target_author = new.user_id then
    raise exception 'cannot_vote_on_own_content' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger votes_validate
  before insert or update on public.votes
  for each row execute function private.votes_validate();

create or replace function private.votes_apply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t_type text := coalesce(new.target_type, old.target_type);
  t_id bigint := coalesce(new.target_id, old.target_id);
  new_value int := case when tg_op = 'DELETE' then 0 else new.value end;
  old_value int := case when tg_op = 'INSERT' then 0 else old.value end;
  delta int := new_value - old_value;
  -- SPEC §5: +2 per upvote and −1 per downvote on posts.
  rep_delta int := (case new_value when 1 then 2 when -1 then -1 else 0 end)
                 - (case old_value when 1 then 2 when -1 then -1 else 0 end);
  post_author uuid;
begin
  if t_type = 'thread' then
    update public.threads set score = score + delta where id = t_id;
  elsif t_type = 'post' then
    update public.posts set score = score + delta where id = t_id returning author_id into post_author;
    if post_author is not null and rep_delta <> 0 then
      update public.profiles set reputation = reputation + rep_delta where id = post_author;
    end if;
  elsif t_type = 'clip' then
    update public.clips set score = score + delta where id = t_id;
  end if;
  return null;
end;
$$;

create trigger votes_apply
  after insert or update or delete on public.votes
  for each row execute function private.votes_apply();

-- ─── Privileges and RLS ─────────────────────────────────────────────────────
-- Column grants: users never write scores, counters or ids directly.
revoke insert, update on public.threads from anon, authenticated;
grant insert (category_id, author_id, title, slug, body_md, tags, is_spoiler, status) on public.threads to authenticated;
grant update (category_id, title, slug, body_md, tags, is_spoiler, status, accepted_post_id) on public.threads to authenticated;

revoke insert, update on public.posts from anon, authenticated;
grant insert (thread_id, author_id, body_md, status) on public.posts to authenticated;
grant update (body_md, status) on public.posts to authenticated;

revoke update on public.notifications from anon, authenticated;
revoke insert on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.forum_categories enable row level security;
create policy "Forum categories are public"
  on public.forum_categories for select
  to anon, authenticated
  using (true);
create policy "Admins manage forum categories"
  on public.forum_categories for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter table public.threads enable row level security;
create policy "Visible threads are public; authors and mods see the rest"
  on public.threads for select
  to anon, authenticated
  using (
    status in ('open', 'solved', 'locked')
    or author_id = (select auth.uid())
    or (select private.is_mod())
  );
create policy "Active users start threads as themselves"
  on public.threads for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.is_active_user())
    and status in ('open', 'held')
    and private.can_post_in_category(category_id)
  );
create policy "Authors and mods update threads"
  on public.threads for update
  to authenticated
  using (author_id = (select auth.uid()) or (select private.is_mod()))
  with check (
    (author_id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_mod())
  );
create policy "Mods delete threads; authors delete unanswered ones"
  on public.threads for delete
  to authenticated
  using ((select private.is_mod()) or (author_id = (select auth.uid()) and reply_count = 0));

alter table public.posts enable row level security;
create policy "Visible posts in visible threads are public"
  on public.posts for select
  to anon, authenticated
  using (
    (status in ('visible', 'deleted') or author_id = (select auth.uid()) or (select private.is_mod()))
    and exists (select 1 from public.threads t where t.id = posts.thread_id)
  );
create policy "Active users reply as themselves"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.is_active_user())
    and status in ('visible', 'held')
    and exists (
      select 1 from public.threads t
      where t.id = posts.thread_id
        and ((t.status in ('open', 'solved') and private.can_post_in_category(t.category_id)) or (select private.is_mod()))
    )
  );
create policy "Authors and mods update posts"
  on public.posts for update
  to authenticated
  using (author_id = (select auth.uid()) or (select private.is_mod()))
  with check (
    (author_id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_mod())
  );
create policy "Mods delete posts"
  on public.posts for delete
  to authenticated
  using ((select private.is_mod()));

alter table public.votes enable row level security;
create policy "Users see their own votes"
  on public.votes for select
  to authenticated
  using (user_id = (select auth.uid()));
create policy "Active users vote as themselves"
  on public.votes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_user()));
create policy "Users change their own votes"
  on public.votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.is_active_user()));
create policy "Users remove their own votes"
  on public.votes for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.blocks enable row level security;
create policy "Users see their own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));
create policy "Users block as themselves"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "Users remove their own blocks"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

alter table public.notifications enable row level security;
create policy "Users see their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));
create policy "Users mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));
