-- Phase 6 · moderation and safety (SPEC §5 safety, §8.2, §9 "mod action on my content", §10;
-- docs/DECISIONS.md D-078 onward). No new tables: the queue reads threads, posts, clips, reports
-- and moderation_actions under the RLS policies Phase 2 wrote.

-- ─── 1. Audit log: whose content it was, and what it said ───────────────────
-- subject_id powers a user's moderation history (/admin/users/[id]); excerpt keeps what an AI
-- rejection refused (nothing else stores it) and the end of a ban.
alter table public.moderation_actions
  add column subject_id uuid references public.profiles (id) on delete set null,
  add column excerpt text check (excerpt is null or char_length(excerpt) <= 500);

create index moderation_actions_subject_idx
  on public.moderation_actions (subject_id, created_at desc)
  where subject_id is not null;

-- ─── 2. Bans and roles (security definer, checked here so the API can't skip them) ─
-- profiles.is_banned, banned_until and role have no column grants (D-039), so these RPCs are the
-- only way to change them as a signed-in user. Each writes the audit log and tells the member.

-- Mods ban members; only admins ban mods; nobody bans an admin or themselves.
-- p_until null = permanent.
create or replace function public.mod_ban_user(p_user_id uuid, p_until timestamptz, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_role text;
  target_role text;
  clean_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  until_text text;
begin
  if not private.is_mod() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if clean_reason is null or char_length(clean_reason) > 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if p_user_id = caller then
    raise exception 'cannot_ban_self' using errcode = '42501';
  end if;
  if p_until is not null and p_until <= now() then
    raise exception 'ban_end_in_past' using errcode = '22023';
  end if;

  select p.role into caller_role from public.profiles p where p.id = caller;
  select p.role into target_role from public.profiles p where p.id = p_user_id;
  if target_role is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if target_role = 'admin' or (target_role = 'mod' and caller_role <> 'admin') then
    raise exception 'cannot_ban_staff' using errcode = '42501';
  end if;

  update public.profiles set is_banned = true, banned_until = p_until where id = p_user_id;

  until_text := case
    when p_until is null then 'Permanent'
    else 'Until ' || to_char(p_until at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC'
  end;
  insert into public.moderation_actions (actor_id, actor_type, action, target_type, target_id, subject_id, reason, excerpt)
  values (caller, 'human', 'ban', 'profile', p_user_id::text, p_user_id, clean_reason, until_text);

  insert into public.notifications (user_id, type, payload)
  values (p_user_id, 'mod_action', jsonb_build_object('message',
    case when p_until is null
      then 'Your account has been suspended. Reason: ' || left(clean_reason, 200)
      else 'Your account is suspended ' || lower(left(until_text, 1)) || substr(until_text, 2)
        || '. Reason: ' || left(clean_reason, 200)
    end));
end;
$$;

create or replace function public.mod_unban_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_role text;
  target_role text;
  clean_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.is_mod() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if clean_reason is not null and char_length(clean_reason) > 500 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;
  select p.role into caller_role from public.profiles p where p.id = caller;
  select p.role into target_role from public.profiles p where p.id = p_user_id;
  if target_role is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if target_role = 'admin' or (target_role = 'mod' and caller_role <> 'admin') then
    raise exception 'cannot_ban_staff' using errcode = '42501';
  end if;

  update public.profiles set is_banned = false, banned_until = null where id = p_user_id;
  insert into public.moderation_actions (actor_id, actor_type, action, target_type, target_id, subject_id, reason)
  values (caller, 'human', 'unban', 'profile', p_user_id::text, p_user_id, clean_reason);
  insert into public.notifications (user_id, type, payload)
  values (p_user_id, 'mod_action', jsonb_build_object('message', 'Your account suspension has been lifted.'));
end;
$$;

-- Admins only, never on their own account (no accidental lock-out).
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  old_role text;
begin
  if not private.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('user', 'mod', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_user_id = caller then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;
  select p.role into old_role from public.profiles p where p.id = p_user_id;
  if old_role is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if old_role = p_role then
    return;
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  insert into public.moderation_actions (actor_id, actor_type, action, target_type, target_id, subject_id, reason)
  values (caller, 'human', 'role_change', 'profile', p_user_id::text, p_user_id, old_role || ' → ' || p_role);
end;
$$;

revoke execute on function public.mod_ban_user(uuid, timestamptz, text) from public, anon;
revoke execute on function public.mod_unban_user(uuid, text) from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.mod_ban_user(uuid, timestamptz, text) to authenticated;
grant execute on function public.mod_unban_user(uuid, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ─── 3. Notifications for moderation outcomes ───────────────────────────────
-- Replies: unchanged from Phase 4, except that a held reply a mod approves now notifies exactly like
-- a new one (the quoted author, the thread author, mentions), and the reply's author hears when a
-- mod approves, removes or restores it (SPEC §9 "mod action on my content").
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
  became_visible boolean := tg_op <> 'DELETE' and new.status = 'visible'
    and (tg_op = 'INSERT' or old.status = 'held');
  thread_author uuid;
  thread_title text;
  thread_slug text;
  actor_name text;
  target_author uuid;
  notified uuid[];
  outcome text;
begin
  if delta <> 0 then
    update public.threads
    set reply_count = greatest(reply_count + delta, 0),
        last_activity_at = case when delta > 0 then now() else last_activity_at end
    where id = coalesce(new.thread_id, old.thread_id);
  end if;

  if tg_op = 'DELETE' or new.author_id is null then
    return null;
  end if;

  if became_visible or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    select t.author_id, t.title, t.slug into thread_author, thread_title, thread_slug
    from public.threads t where t.id = new.thread_id;
  end if;

  if became_visible then
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

  if tg_op = 'UPDATE' and new.status is distinct from old.status and not new.is_ai then
    outcome := case
      when old.status = 'held' and new.status = 'visible' then 'Your reply in “%s” was approved.'
      when new.status = 'removed' then 'A moderator removed your reply in “%s”.'
      when old.status = 'removed' and new.status = 'visible' then 'Your reply in “%s” was restored.'
    end;
    if outcome is not null then
      insert into public.notifications (user_id, type, payload)
      values (new.author_id, 'mod_action', jsonb_build_object(
        'message', format(outcome, left(coalesce(thread_title, 'a thread'), 80)),
        'thread_id', new.thread_id, 'post_id', new.id, 'thread_title', thread_title, 'thread_slug', thread_slug));
    end if;
  end if;

  return null;
end;
$$;

-- Threads: approving a held thread sends the mention notifications it skipped (threads_after_insert
-- only notifies open threads), and the author hears about approval, removal, restoring and locking.
create or replace function private.threads_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  outcome text;
begin
  if new.status is not distinct from old.status or new.author_id is null then
    return null;
  end if;

  if old.status = 'held' and new.status in ('open', 'solved', 'locked') then
    select p.username::text into actor_name from public.profiles p where p.id = new.author_id;
    perform private.notify_mentions(
      new.body_md, new.author_id, actor_name, new.id, null, new.title, new.slug, array[new.author_id]);
    outcome := 'Your thread “%s” was approved.';
  elsif new.status = 'removed' then
    outcome := 'A moderator removed your thread “%s”.';
  elsif old.status = 'removed' and new.status in ('open', 'solved', 'locked') then
    outcome := 'Your thread “%s” was restored.';
  elsif new.status = 'locked' then
    outcome := 'A moderator locked your thread “%s”.';
  end if;

  if outcome is not null then
    insert into public.notifications (user_id, type, payload)
    values (new.author_id, 'mod_action', jsonb_build_object(
      'message', format(outcome, left(new.title, 80)),
      'thread_id', new.id, 'thread_title', new.title, 'thread_slug', new.slug));
  end if;
  return null;
end;
$$;

create trigger threads_status_change
  after update of status on public.threads
  for each row execute function private.threads_status_change();
