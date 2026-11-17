-- Phase 3 · content system + CMS (SPEC §4, §9, §10). See docs/DECISIONS.md D-050 onward.

-- 1. "Updated x ago" means the content changed. Helpful votes and view counts update counters on
--    the row, so the updated_at trigger now fires only when an editorial column changes.
drop trigger articles_touch_updated_at on public.articles;

create trigger articles_touch_updated_at
  before update on public.articles
  for each row
  when (
    (old.type, old.slug, old.title, old.summary, old.body_md, old.cover_image_url, old.tags, old.status,
     old.spoiler_level, old.fact_status, old.sources, old.published_at)
    is distinct from
    (new.type, new.slug, new.title, new.summary, new.body_md, new.cover_image_url, new.tags, new.status,
     new.spoiler_level, new.fact_status, new.sources, new.published_at)
  )
  execute function private.touch_updated_at();

-- 2. When the publish pipeline (cache tags, embedding job, IndexNow) last ran for an article.
--    A scheduled article (status 'published', published_at in the future) is already hidden by
--    RLS; /api/cron/publish-scheduled runs the pipeline once published_at has passed (D-052).
alter table public.articles add column pipeline_ran_at timestamptz;

create index articles_scheduled_idx on public.articles (published_at)
  where status = 'published' and pipeline_ran_at is null;

-- 3. Newsletter double opt-in (D-054). Lists wait in pending_lists until the address is confirmed;
--    confirm_token holds a SHA-256 hash of the emailed token, never the token itself.
alter table public.newsletter_subscribers
  add column pending_lists text[] not null default '{}',
  add column confirm_sent_at timestamptz;

alter table public.newsletter_subscribers alter column lists set default '{}';

alter table public.newsletter_subscribers
  add constraint newsletter_lists_known check (lists <@ array['digest', 'online_waitlist']::text[]),
  add constraint newsletter_pending_lists_known check (pending_lists <@ array['digest', 'online_waitlist']::text[]);

create unique index newsletter_confirm_token_idx on public.newsletter_subscribers (confirm_token)
  where confirm_token is not null;
