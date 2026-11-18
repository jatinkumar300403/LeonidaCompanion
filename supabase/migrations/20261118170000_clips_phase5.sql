-- Phase 5 · clips (SPEC §6, D-070). Embeds only: no video is ever stored.

-- ─── Submissions go through the server ─────────────────────────────────────
-- resolveClip() checks the platform metadata (GTA VI on Twitch, embeddable, ≤ 60 s) before a row
-- exists, so the title, creator and thumbnail always come from the platform, never from the
-- member. The server inserts with the service role (src/server/admin/clips.ts); members can no
-- longer insert clip rows directly through the API with made-up metadata.
drop policy if exists "Active users submit clips as themselves" on public.clips;
revoke insert on public.clips from anon, authenticated;

-- ─── Approval bookkeeping: the payload key the bell reads is clip_title ────
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
      values (new.submitted_by, 'clip_approved', jsonb_build_object('clip_id', new.id, 'clip_title', new.title));
    end if;
  elsif old.status = 'approved' and new.status <> 'approved' then
    if new.submitted_by is not null then
      update public.profiles set reputation = reputation - 5 where id = new.submitted_by;
    end if;
  end if;

  if new.status = 'rejected' and old.status = 'pending' and new.submitted_by is not null then
    insert into public.notifications (user_id, type, payload)
    values (new.submitted_by, 'clip_rejected', jsonb_build_object(
      'clip_id', new.id, 'clip_title', new.title, 'reason', new.reject_reason));
  end if;
  return null;
end;
$$;

-- ─── Votes: clips only while approved ───────────────────────────────────────
-- Same as Phase 2, except a clip must be approved (mods see pending clips, but votes on them would
-- carry over into the feed once approved).
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
    select c.submitted_by, true into target_author, target_exists
    from public.clips c
    where c.id = new.target_id and c.status = 'approved';
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

-- ─── Hot clips (D-022: the thread hot-rank formula, counted from approval) ─
-- Runs as the caller, so RLS applies; approved only. `p_offset` pages by offset like hot_threads.
create or replace function public.hot_clips(p_category text default null, p_limit int default 20, p_offset int default 0)
returns setof public.clips
language sql
stable
set search_path = ''
as $$
  select c.*
  from public.clips c
  where c.status = 'approved'
    and (p_category is null or c.category = p_category)
  order by public.hot_rank(c.score, coalesce(c.approved_at, c.created_at)) desc,
           c.approved_at desc nulls last,
           c.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.hot_clips(text, int, int) to anon, authenticated, service_role;

-- Clip of the day and "Top this week" read approved clips by score inside a time window.
create index if not exists clips_approved_score_idx on public.clips (approved_at desc, score desc)
  where status = 'approved';
