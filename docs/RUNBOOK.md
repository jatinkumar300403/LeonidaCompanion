# RUNBOOK: Leonida Atlas operations

For whoever runs the site day to day. Written in Phase 10 (25 Nov 2026), before the production deploy. Sections marked **after Phase 7/8** describe features that aren't built yet. Their exact steps get confirmed when those phases land.

- Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md` (D-xxx). Status: `docs/PROGRESS.md`.
- **Roles:**
  - *mod*: moderation, the clips queue and users;
  - *admin*: everything a mod can do, plus articles, launch facts, flags and roles.
  - Every screen lives under `/admin`.
- **Never** edit content in the Supabase table editor. Direct edits skip the cache tags and appear only after the cache expires (up to 10 minutes, D-051), and they skip the audit log.

---

## 1. Publish a Quick Tip (from a phone)

1. Sign in as an admin, then open **`/admin` → New quick tip** (or `/admin/articles/new?type=tip&mode=quick`).
2. Fill in the title, the body (markdown; wrap spoilers in `||…||`), tags and the spoiler level, and add at least one source when the tip states a fact.
3. Press **Publish**. The publish pipeline then runs:
   - it refreshes the cache tags, so `/tips`, the tip page, the sitemap and RSS update straight away;
   - it runs the embedding stub (real embeddings come in Phase 7);
   - it pings IndexNow (only if `INDEXNOW_KEY` is set).
4. Open the tip from `/tips` and check how it reads.

- **Scheduling:** in the full editor (`/admin/articles/<id>`), pick **Schedule**. The `publish-scheduled` cron publishes it within 10 minutes of the chosen time (D-052).
- **Unpublish:** in the editor, **Unpublish** makes it a draft again and removes it from public lists at once.
- **Content written by Claude:** it's always saved as `status='draft'` with sources (CLAUDE.md). Review it before you publish.

## 2. Approve or reject clips

Open `/admin/clips`. The tabs are Pending, Approved, Rejected and Removed, and there's a filter by source (member submissions or Twitch auto-candidates).

- **Keyboard shortcuts:**
  - **J / K**: next / previous clip;
  - **A**: approve;
  - **R**: reject a pending clip, or remove an approved one. A reason is required, and the submitter sees it.
- **Check before approving:**
  - the clip is from GTA VI;
  - it isn't an isolated cutscene or ending (rule 5);
  - it isn't cheating, an exploit or a money glitch (rule 6);
  - the category is right (you can change it when approving).
- **Approving:** the clip goes public, the submitter gets +5 reputation and a notification, and the action is logged.
- **Clips are only ever shown through official embeds.** Nothing is downloaded or re-hosted (rule 1). If a creator asks for a clip to go, remove it here, then close their request (§3).

## 3. Reports, bans and removal (DMCA) requests

Open `/admin/moderation`. It has three tabs: **Held**, **Reports** and **Recent actions**.

- **Held:** content the AI pre-check, or its fallback (no Anthropic key), held for review.
  - **Approve** publishes it and tells the author.
  - **Remove** hides it.
  - `self_harm` holds also send every admin an in-app alert (the bell). Handle those first and kindly.
- **Reports** are grouped per item. The options are **Remove**, **Dismiss**, **Lock** (threads), **Move** (threads) and **Ban author**.
  - A ban needs a reason the member sees, and an end date (or permanent, admins only).
  - Nobody can ban themselves or an admin, and only admins can ban a mod.
  - The reporter is never told who acted, and the reported member is never told who reported them.
- **Removal / DMCA requests** come from `/dmca`. They show in Reports as "Removal request", with the clip or page and the requester's details, and the admin gets an email (once Resend is set up). To handle one:
  1. Check the claim: the requester is the creator, or acts for them.
  2. Remove the content: a clip in `/admin/clips`, a post or thread with Remove here.
  3. Mark the request handled. `/dmca` promises "usually within 24 hours".
  4. Reply to the requester by email from the admin inbox. The site never emails them, so it can't be used to mail third parties.
- **Users:** `/admin/users` lets you search, open a user, see their history, ban or unban them, and change their role (admins only).

## 4. Feature flags (`/admin/settings`, admin only)

Saving refreshes the cached flags at once, and static pages pick the change up within 5 minutes (D-086).

| Flag | What it does |
| --- | --- |
| `FEATURE_ONLINE` | `/online` stops being "coming soon" and becomes the guides index, and the forum's Online category opens to members. Flip it only once Rockstar has released Online and there's at least one guide. |
| `MAINTENANCE_MODE` | Pauses every member write (posts, clips, votes, profile edits) and shows a site banner. Staff can still act. Use it during incidents or migrations. |
| `SHADOW_HOLD_NEW_USERS` | Holds everything from new accounts for review. Use it during a spam wave. |
| `FEATURE_ASK_ANON` | **After Phase 8:** logged-out visitors can use Ask AI (Turnstile plus 5 a day). Open question Q1. |
| `FEATURE_ADS` | Unused in v1. Ads in the EU need a certified CMP first (SPEC §13) and Vercel Pro. |

## 5. Crons

Phase 11 sets them up in `vercel.json` (Vercel Pro), or in `.github/workflows/cron.yml` on Hobby (Q3). Each route needs `Authorization: Bearer $CRON_SECRET`, and anything else gets a 401. Vercel Cron sends GET, and a manual run can use GET or POST.

| Route | Schedule | Without its keys |
| --- | --- | --- |
| `/api/cron/publish-scheduled` | every 10 min | 503 without `SUPABASE_SECRET_KEY` |
| `/api/cron/twitch-clips` | hourly | `{ "skipped": "Twitch keys missing" }` |
| `/api/cron/weekly-clips` | Mon 06:00 UTC | `{ skipped }` without the service key. `?week=2026-w47` backfills a finished week; an open week is refused. |
| `/api/cron/wiki-sync` | every 6 h | **after Phase 7** |
| `/api/cron/digest`, `/api/cron/notify-email` | Mon 08:00 UTC, hourly | **post-launch (Phase 12)** |

Running a cron by hand (PowerShell):

```powershell
curl.exe -s -H "Authorization: Bearer $env:CRON_SECRET" https://<domain>/api/cron/publish-scheduled
```

## 6. Wiki sync (**after Phase 7**)

- **Sources:** only the sources in `src/config/sources.ts` with `commercialUse: true` are ingested (rule 4; `SITE_COMMERCIAL=false` allows the others). It's text only, never images. A unit test guards the licence filter.
- **Manual run:** `pnpm ingest:wiki` (locally, against DEV). On production, run the `wiki-sync` cron route with the bearer secret. Each run is time-boxed and capped by `WIKI_MAX_PAGES_PER_RUN` (D-013), and identifies itself with `WIKI_CONTACT_EMAIL`.
- **Checking:** `/admin/wiki` shows the runs (`ingest_runs`), the pages that changed and any errors. `/credits` must list every source with its licence and attribution.
- **When a wiki blocks us or changes its terms:** pause the cron (remove its schedule), re-read the terms, and remove the source from `sources.ts` if it no longer allows our use. Then delete its chunks (Phase 7 adds the command).
- **Re-embedding** (a model change, or Voyage was down during a run): Phase 7 will document the re-embed command. Until it's run, Ask AI answers from the older chunks.

## 7. Ask AI (**after Phase 8**)

- Answers must cite sources and say "Not confirmed yet" when the sources don't cover a question (rule 8).
- `ASK_MIN_SCORE` sets how good retrieval must be before the model is called at all. Raise it if answers start guessing.
- `/admin/gaps` lists questions rated 👎 or that got "Not confirmed yet". These are candidates for new tips and facts.
- Before Phase 8 ships, check prompt injection ("ignore your sources…") against the eval set. Answers must stay grounded.

## 8. Rotating keys

General order: create the new key, put it in Vercel (Production, plus Preview where used), redeploy, check the site, then revoke the old key. Never paste keys in chat, issues or commits. `.env.local` stays local.

| Key | Where | What happens during the swap |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase → API keys (new secret key) | Crons and the admin-only writes (removal requests, clip inserts, exports) fail until the redeploy. Revoke the old key afterwards. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API keys | It's built into the client, so it needs a redeploy. Keep both keys active until the old deploy has drained. |
| `SUPABASE_ACCESS_TOKEN` | supabase.com account tokens | Used only by the CLI and scripts. Rotate it locally. |
| `CRON_SECRET` | any 32+ random characters | Update the Vercel Cron config or the GitHub Actions secret at the same time, or crons get 401s until both match. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console (reset token) | Between reset and redeploy, Redis calls fail. Rate limits fall back to the per-instance limiter (D-105), and the caches (Twitch token) start cold. |
| `TURNSTILE_SECRET_KEY` / site key | Cloudflare → Turnstile (rotate secret) | Cloudflare's rotation keeps the old secret working for a short grace period (the dashboard says how long). Redeploy within it, or the bot check fails on every public form. |
| `ANON_HASH_SALT` | random | **Avoid rotating.** It resets anonymous vote identities (people can vote again) and every rate-limit counter. |
| `ANTHROPIC_API_KEY` | Anthropic Console | Without a key, moderation uses the fallback (it holds new members' posts) and, after Phase 8, Ask AI is off. Keep the spend limit set. |
| `VOYAGE_API_KEY` | Voyage dashboard | **After Phase 7:** ingestion and query embeddings stop. Ask falls back to full-text search. |
| `TWITCH_CLIENT_SECRET` | dev.twitch.tv console | The cached app token keeps working until it expires. Then Twitch links show "can't be checked yet" and the cron skips. |
| `YOUTUBE_API_KEY` | Google Cloud console | YouTube links show "can't be checked yet" until the redeploy. |
| `RESEND_API_KEY` | Resend → API keys | Admin emails (removal requests) and newsletter confirmations stop until the redeploy. Supabase Auth SMTP has its own copy: update it there too. |
| `SENTRY_AUTH_TOKEN` / DSN | Sentry | The token only affects source-map upload at build time. A new DSN needs a redeploy. |
| `INDEXNOW_KEY` | any 8–128 characters | `/api/indexnow` serves the new key after the redeploy. Bing re-reads it. |

## 9. When a dependency is down

| Down | What visitors see | What to do |
| --- | --- | --- |
| **Anthropic** | The AI pre-check falls back (SPEC §8.2): posts from members under 20 reputation are held, bios can't be saved, and `/admin/moderation` shows a banner. **After Phase 8:** Ask AI says it can't answer right now, and the AI suggested answer on new threads is skipped. | Work through the Held queue more often. Turn on `SHADOW_HOLD_NEW_USERS` if spam gets through. Check status.anthropic.com. Nothing needs restarting; it recovers by itself. |
| **Voyage** (**after Phase 7/8**) | Ask uses full-text retrieval only (lower quality) and ingestion pauses. | Re-run the sync once it's back. Re-embed anything that was skipped. |
| **Twitch** | Twitch clip links show "can't be checked yet" and the hourly cron reports errors. Embeds that already exist keep playing (they're Twitch's own player). | Nothing. Members can submit again later. |
| **YouTube API** | YouTube links show "can't be checked yet". Existing clips play. | Check quota in the Google Cloud console. A quota overrun clears at midnight Pacific time. |
| **Upstash** | Nothing visible. Rate limits fall back to a per-instance in-memory limit (D-105), and the Twitch token is re-fetched more often. | Check the Upstash status page. If spam rises while it's down, turn on `SHADOW_HOLD_NEW_USERS`. |
| **Turnstile** | Public forms (sign-up, posts, clip submissions, removal requests) can't pass the bot check. | Wait, or as a last resort turn on `MAINTENANCE_MODE` and post a notice. Never remove Turnstile from the code. |
| **Resend** | Admin emails and newsletter confirmations fail and are logged. Removal requests still reach the Reports queue. Sign-in emails go through Supabase SMTP: if that's Resend too, **sign-in is down**. | Tell people on the site banner (`MAINTENANCE_MODE` if needed). Supabase's built-in mailer is only good for a few emails an hour. |
| **Supabase** | Pages served from cache keep working for a while. Sign-in, the forum and every write fail. | Turn on `MAINTENANCE_MODE` (if the dashboard still loads) and check status.supabase.com. |
| **Vercel** | The whole site is down, apart from what the service worker has cached (`/offline` and the guides people saved). | Check vercel-status.com. |

## 10. DEV hygiene and tests

- `pnpm test:cleanup` removes every `rls-…` / `e2e-…@example.com` user and their content, reports and audit rows from DEV. Run it after QA sessions; Playwright also runs it after E2E.
- **E2E:**
  - Full `pnpm e2e` runs use about 28 of DEV's 30 magic-link verifications per 5 minutes, so space full runs 5 minutes apart and use `--workers=4` (D-089).
  - `pnpm e2e:prod` needs `pnpm build` first and a free port 3000.
  - On this Windows machine, `pnpm lhci` needs a Chromium started with `--remote-debugging-port=9222` and `LHCI_CHROME_PORT=9222` (D-099).
- **Migrations:** `pnpm db:push` goes to DEV only, through the `@dev` guard. The CLI calls every project's main branch "production", even DEV; check the project ref, not that label (D-108). PROD gets migrations only through Phase 11's documented steps.
- **Security regression suites:**
  - `supabase/tests/attacks.test.ts` (RLS and write-guard attacks);
  - `src/components/shared/markdown-renderer.test.tsx` (the XSS payload list);
  - `src/lib/auth/redirect.test.ts` (open redirects);
  - `src/app/api/cron/cron-routes.test.ts` (the bearer secret);
  - `e2e-prod/bundle-secrets.spec.ts` (no secrets in client bundles).
  Keep them green.
