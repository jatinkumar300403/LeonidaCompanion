-- Phase 10 QA hardening (D-100): votes and helpful feedback can't be moved to another target.
--
-- Members may UPDATE their own vote (the app's upsert changes `value`). The score trigger only
-- applies the value delta to the row's current target, so retargeting a row moved nothing; voting
-- on the old target again then counted twice. Repeated, that farmed scores and author reputation,
-- and reputation unlocks links and skips the new-account moderation hold. Same idea for
-- article_feedback (a vote moved onto a draft). Upserts keep working: their conflict columns
-- never change.

create or replace function private.votes_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_author uuid;
  target_exists boolean := false;
begin
  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.target_type is distinct from old.target_type
    or new.target_id is distinct from old.target_id
  ) then
    raise exception 'vote_target_immutable' using errcode = '42501';
  end if;

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

create or replace function private.article_feedback_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.article_id is distinct from old.article_id or new.voter_key is distinct from old.voter_key then
    raise exception 'feedback_target_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.article_feedback_guard() from public, anon, authenticated;

drop trigger if exists article_feedback_guard on public.article_feedback;
create trigger article_feedback_guard
  before update on public.article_feedback
  for each row execute function private.article_feedback_guard();
