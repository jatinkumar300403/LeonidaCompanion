# PROGRESS — Leonida Atlas

Launch: **Thu 19 Nov 2026**. Last updated: 2026-11-18 (Phase 6). Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md` (D-xxx).
Legend: `[x]` done · `[ ]` to do · ⚡ = cut first if behind. The kit's fallback: ship 0–6 and 9–11 on launch day, then 7–8 on the 20th.

## Status
- **Done: Phase 0.** Kit files copied in, git initialised, `.env.local` created with generated secrets, versions checked, this plan written.
- **Done: Phase 1.** Next 16.4.6 app with the "Leonida Dusk" design system, the layout shell, every §2 component, the home page, `/admin/ui`, stubs for every §1 route, and tooling plus CI (D-027 to D-037).
  - Checks: `pnpm typecheck`, `lint`, `test` (297 unit tests) and `build` all pass. `pnpm e2e` passes 13 smoke tests on mobile 390×844 and desktop 1440×900.
  - Visual QA: `/`, `/tips` and `/admin/ui` checked with the Playwright MCP at 390 and 1440, in dark and light. Fixes made during the check:
    - hero art added;
    - the clip art sun is round;
    - disabled gradient buttons are neutral;
    - thread score boxes are compact;
    - inline spoilers wrap with the text;
    - the showcase no longer autofocuses.
- **Done: Phase 2.**
  - Schema, RLS, auth, profiles, settings and the `/admin` gate are in place on Supabase DEV (D-038 to D-049): 9 migrations plus seed, every §11 table with RLS, and the storage buckets.
  - The Supabase security advisor shows no errors. The one WARN, `get_my_profile`, is deliberate (D-039).
  - Checks:
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass, the build also without keys (CI);
    - `pnpm test`: 385 unit tests;
    - `pnpm test:db`: 48 RLS and trigger tests against DEV;
    - `pnpm e2e`: 23 passed, 3 viewport skips, including E2E #1 sign-up, onboarding redirects, open-redirect, delete account and the mod-only `/admin/ui`.
  - Visual QA with the Playwright MCP of /sign-in, /onboarding, /settings, /u/[username] and the header menu at 390 and 1440, in dark and light. Fixes made during the check:
    - short "Xbox Series" platform pill;
    - large avatar initials;
    - inputs no longer blank after a failed submit;
    - stale field errors clear;
    - account slot width.
- **Done: Phase 3.**
  - Content system and admin CMS (D-050 to D-060): 1 migration on DEV (`updated_at` ignores counters, `pipeline_ran_at`, newsletter opt-in columns), cached public reads, the publish pipeline (cache tags, embedding stub, IndexNow), the scheduled-publish cron, `/tips` `/features` `/facts` indexes and article pages, `/online`, `/launch`, newsletter double opt-in, `/api/og`, and the admin dashboard, article list, editor (Quick Tip + full mode) and `/admin/launch`.
  - Checks:
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass, the build also without keys (CI);
    - `pnpm test`: 434 unit tests;
    - `pnpm test:db`: 51 RLS and trigger tests against DEV;
    - `pnpm e2e`: 27 passed, 5 viewport skips, including E2E #6 (Quick Tip from a phone → visible on /tips), E2E #7 (spoilers) and the newsletter double opt-in.
  - `pnpm seed:dev` put 18 `[SAMPLE]` drafts (3 per type) on DEV.
  - Visual QA with the Playwright MCP of an article page, `/tips`, `/facts`, `/launch`, `/online`, `/admin`, `/admin/articles`, the Quick Tip and full editors and `/admin/launch`, at 390 and 1440 in dark and light. Fixes made during the check:
    - the lede is hidden when a quick tip's summary repeats the body;
    - the breadcrumb truncates on one line on phones;
    - the sort controls wrap as one group;
    - no scrollbars on the tag row and the admin tabs.
- **Done: Phase 4.**
  - Help forum (D-061 to D-069):
    - 1 migration on DEV: the edit window, new-account limits and links enforced in the DB, quote replies + `post_reply`, thread mentions, `similar_threads`, `threads.excerpt`;
    - `server/forum`: cached reads, the viewer overlay, actions;
    - `/forum`, `/forum/[category]`, `/forum/t/[id]/[slug]`, `/forum/new`;
    - report and block, the header notification bell, the home "Trending" block on real threads, and recent threads + report/block on profiles.
  - Checks:
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass;
    - `pnpm test`: 464 unit tests;
    - `pnpm test:db`: 63 tests (12 new);
    - `pnpm e2e`: 31 passed, 5 viewport skips, including E2E #2 (without the AI part) on mobile and desktop.
  - E2E #1 timed out once under full-suite load (about 10 s alone). Its budget is now 60 s.
  - Visual QA with the Playwright MCP of `/forum`, `/forum/help`, a thread page, `/forum/new` and the bell, at 390 and 1440 in dark and light. Fixes made during the check:
    - deleted replies no longer show vote arrows;
    - the replies heading no longer counts the pinned accepted answer.
  - QA and test data were removed with `pnpm test:cleanup`.
- **Done: Phase 5.**
  - Clips through official embeds only (D-070 to D-077):
    - 1 migration on DEV: members can't insert clips through the API any more (the server resolves and inserts them); votes only on approved clips; `hot_clips`; the approval notification now carries `clip_title`;
    - `resolveClip()` with URL parsers for every Twitch, YouTube and TikTok shape, Twitch Helix (cached app token, GTA VI game-id check), YouTube Data API (embeddable, ≤ 60 s, not live) and TikTok oEmbed, all on recorded fixtures;
    - `/clips/submit` (live preview, category, caption, "not a story spoiler", Turnstile), `/admin/clips` (Pending / Approved / Rejected / Removed, source filter, A/R/J/K keys, audit log), `/clips` (category filter, Hot / New / Top this week, votes), `/clips/[id]` (credit, Watch on, report, removal link, VideoObject JSON-LD), `/clips/top/[week]`;
    - the `twitch-clips` and `weekly-clips` crons, the real clip of the day on home, TikTok's `embed.js` on demand, a thumbnail fallback, and a first CSP (`frame-src` for the official players).
  - Checks:
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass;
    - `pnpm test`: 590 unit tests;
    - `pnpm test:db`: 71 tests (8 new in `supabase/tests/clips.test.ts`);
    - `pnpm e2e`: 35 passed, 5 viewport skips, including E2E #4 (YouTube clip with the API mocked → pending → admin approves → in `/clips` → the facade loads the nocookie iframe) on mobile and desktop.
  - Both crons were run by hand against the dev server: no bearer → 401; `twitch-clips` without keys → `{ skipped }`; `weekly-clips` freezes a finished week, refuses the current one and leaves an existing snapshot alone.
  - Visual QA at 390 and 1440, in dark and light, of `/clips`, a clip page, `/clips/submit`, `/clips/top/[week]` and `/admin/clips`. The Playwright MCP browser was locked by another session, so a Playwright script took the same captures. No horizontal overflow and no CSP violations. YouTube and Twitch players load in their frames (Twitch accepts `parent=localhost`).
  - QA rows, snapshots and test users were removed; DEV has no clips.
- **Done: Phase 6.**
  - Moderation and safety (D-078 to D-090):
    - **AI pre-check** (SPEC §8.2) on new threads, replies, edits of both, clip submissions and profile text. It uses the fast model with a strict zod schema, thinking off, low effort, a 4 s limit and no retries. Labels map to allow / hold / reject in code. An untagged spoiler on its own is sent back to be tagged; a hold saves the item as `held` with "Pending review"; `self_harm` alerts every admin.
    - **No key = fallback**, applied, logged and shown in the admin UI.
    - 1 migration on DEV: `moderation_actions.subject_id` + `excerpt`; the `mod_ban_user`, `mod_unban_user` and `admin_set_role` RPCs; notifications when a held reply or thread is approved, and "mod action on my content" notices for approve, remove, restore and lock.
    - `/admin/moderation`: Held · Reports (grouped, Remove / Dismiss / Lock / Move / Ban author) · Recent actions (human and AI).
    - `/admin/users` and `/admin/users/[id]`: search, activity, moderation history, ban/unban, role change for admins.
    - `/admin/settings`: the flags, plus the new `SHADOW_HOLD_NEW_USERS`. `MAINTENANCE_MODE` pauses member writes and shows a site banner; `FEATURE_ONLINE` also unlocks the Online category.
    - A held-count stat on the dashboard.
    - The Community Guidelines page is a **draft** (badge on the page) for owner review.
  - Checks:
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass;
    - `pnpm test`: 671 unit tests, including one mocked answer per §8.2 label, parse failures, refusal, `max_tokens`, API errors and the 4 s timeout with fake timers;
    - `pnpm test:db`: 87 tests (16 new in `supabase/tests/moderation.test.ts`);
    - `pnpm e2e --workers=4`: 39 passed, 5 viewport skips. New: `e2e/moderation.spec.ts`, mobile and desktop:
      - E2E #3: report a reply → Reports queue → ban the author for a day from the card → Remove → hidden for visitors, report `actioned`, audit row written;
      - the held-reply flow: Pending review → approve in Held → public.
    - With the default 8 workers on one dev server, the `/admin/ui` "networkidle" smoke test and the waitlist confirm can time out (they pass alone). Back-to-back full runs also hit Supabase's verify limit (D-089).
  - Visual QA at 390 and 1440, dark and light (36 captures):
    - pages: `/admin/moderation` (Held, Reports, Recent actions), `/admin/users`, a user page, `/admin/settings`, `/community-guidelines`, and a held thread and a held reply as their authors see them;
    - no horizontal overflow and no console errors;
    - the Playwright MCP browser was locked by another session again, so a Playwright script took the captures;
    - fixes made during the check: profile reports say "Ban user"; Settings no longer shows the no-key warning twice; the user page's Ban button is solid.
  - QA rows and test users were removed with `pnpm test:cleanup`, which now also sweeps reports filed by test users and audit rows about them.
  - Two leftover audit rows from Phase 2's first RLS run were deleted.
  - DEV ends with no test users, threads, held items, reports, audit rows or clips, the flags all off, and Online locked.
- **Next:** Phase 9 (Prompt 9: SEO, PWA, analytics, legal, performance) for launch day. Phases 7–8 (wiki ingestion, Ask AI) move to Fri 20 Nov (kit cut line).
  - Phase 8 must run `onThreadCreated()` when a mod approves a held Q&A thread (D-080).
  - Phase 9's legal pages can link the guidelines draft.
- **Owner to-dos from Phase 6:**
  - **Add `ANTHROPIC_API_KEY` before launch.** Until then the SPEC §8.2 fallback holds every thread and reply from members under 20 reputation (almost everyone on day one), and those members can't save a bio. `/admin/moderation` says so in a banner.
  - **Set a spend limit** in the Anthropic Console. A check costs about $0.0001–0.0003 with Haiku 5.5 at $0.10 / $0.50 per MTok.
  - Then run the live check once: `$env:MODERATION_LIVE="1"; pnpm vitest run src/server/moderation/ai.live.test.ts`. It makes one real call per §8.2 label and checks:
    - each label comes back as expected;
    - the answer parses as strict JSON (no fallback);
    - latency stays under the 4 s timeout.
    If a label misfires, tune `MODERATION_SYSTEM_PROMPT` in `src/server/ai/prompts.ts`, not the rules.
  - Review the Community Guidelines draft (`/community-guidelines`), then remove the Draft badge.
  - Optional: raise DEV Auth's `rate_limit_verify` (30 per 5 min) if full E2E runs need to run back to back (D-089).
- **Owner to-dos from Phase 5:**
  - Add `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` and `YOUTUBE_API_KEY` (all empty today). Until then YouTube and Twitch links show "can't be checked yet" and the Twitch cron skips. TikTok links work without a key.
  - Then check against the live APIs:
    - Twitch: the token request works; `GET /helix/games?name=Grand Theft Auto VI` returns an id (put it in `TWITCH_GTA6_GAME_ID`); both URL shapes (`clips.twitch.tv/<slug>` and `twitch.tv/<channel>/clip/<slug>`) resolve; a clip from another game is refused; the thumbnail host is on the allowlist in `src/config/clips.ts`; the embed plays on localhost; one manual `twitch-clips` run inserts pending candidates.
    - YouTube: `videos.list` returns `items` with `status.embeddable` and `contentDetails.duration`; a Short and a watch link both resolve; a non-embeddable video is refused; thumbnails come from `i.ytimg.com`.
    - TikTok (from outside India): oEmbed returns `embed_product_id`, the thumbnail host is on the allowlist, and `embed.js` turns the blockquote into a player under the CSP.
    - Then replace the fixtures in `src/server/clips/__fixtures__` with real responses and run `pnpm test`.
  - Add the cron schedules in Phase 11: `/api/cron/twitch-clips` hourly and `/api/cron/weekly-clips` Monday 06:00 UTC.
- **Owner to-dos from Phase 3:**
  - Add `RESEND_API_KEY` and a real `EMAIL_FROM` on a verified domain. Until then newsletter sign-ups work only on DEV (dev outbox, D-054) and stay disabled in production.
  - Optional: `INDEXNOW_KEY` (any 8–128 letters, digits or dashes), so publishing pings Bing.
  - Publish through the CMS, not the Supabase table editor: direct edits show up only after the cache expires (up to 10 minutes, D-051).
- **Owner to-dos from Phase 2** (none block Phase 4):
  - Supabase DEV → Auth → URL configuration: Site URL `http://localhost:3000` and redirect URL `http://localhost:3000/**` (plus the prod and preview URLs later, SETUP §2).
  - Turn on Google and Discord in Supabase. Their buttons appear automatically once enabled.
  - Resend SMTP in Supabase (Phase 3). The default Supabase mailer only sends to project team members, a few emails an hour.
  - Sign in once with `SEED_ADMIN_EMAIL`. That account becomes admin automatically when it finishes onboarding (D-041).
  - Optional: switch the magic-link email template to the `token_hash` link (`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`) so links also work when opened in another browser.
  - Sign in to the Supabase MCP (`/mcp`).

  Optional: push to a GitHub repo and connect it to Vercel for Preview deploys.
- **Known issues:**
  - CI (`.github/workflows/ci.yml`) has not run yet: there is no git remote. In CI, `test:db` and the auth E2E tests skip (no DEV keys).
  - Vercel Production deploys fail until the D-023 keys exist (D-027). Preview deploys work.
  - The magic link from the default email template uses PKCE, so it must be opened in the browser that requested it (see the template to-do above).
  - Screenshots taken with the Playwright MCP during page load log a harmless hydration warning (Playwright injects `caret-color`).
  - `pnpm ingest:wiki` only prints a Phase 7 placeholder.
  - Sample clips use fake ids, so a loaded embed shows the platform's "unavailable" message.
  - TikTok is blocked in India: this machine resolves `www.tiktok.com` to an ISP "restricted" page. TikTok's live oEmbed and `embed.js` couldn't be checked here, and visitors in India won't see TikTok thumbnails or players (D-071).
  - The platform fixtures follow the documented responses, not recorded live ones (no keys yet). See the Phase 5 owner to-dos.
  - `/dmca` is still a stub: the "I'm the creator: remove this" link sends `?clip=<id>`, which Phase 9's removal form must read (D-076).
  - The CSP so far covers `frame-src`, `object-src` and `base-uri` only. Phase 9 adds the rest (D-075).
  - Clip pages, lists and weekly pages are cached (D-073), so rows changed directly in the database show up after the cache expires, as with articles and the forum.
  - ESLint 9 shows npm's deprecation warning. It stays until the plugins support ESLint 10 (D-034).
  - The Supabase and Vercel MCP servers still need the owner's sign-in. Context7 and Playwright work. Phases 2–3 used the Supabase CLI and the Management API instead.
  - Rows changed directly in the database skip the cache tags, so public pages show them within 10 minutes (D-051). `pnpm test:cleanup` deletes test articles the same way.
  - `pnpm seed:dev` prints Node's "module type" warning (the repo has no `"type": "module"`). It is harmless.
  - `next dev` regenerates a managed `AGENTS.md`; it is gitignored (D-060).
  - The OG image uses the default font, not Bricolage Grotesque (Phase 9 can load the font file).
  - **No `ANTHROPIC_API_KEY` yet:** the AI pre-check runs on the §8.2 fallback. Members under 20 reputation are held for review and can't save a bio. See the Phase 6 owner to-dos.
  - The AI pre-check runs in Server Actions only. A member writing through the PostgREST API with their own JWT skips it; the database limits still apply (D-088, post-launch fix).
  - A held Q&A thread that a mod approves gets no AI suggested answer yet. Phase 8 should call `onThreadCreated()` on approval (D-080).
  - Onboarding's display name isn't pre-checked; edits in Settings are (D-080).
  - Static pages (`/about`, `/terms`, …) now revalidate every 5 minutes instead of never, because the maintenance banner reads the cached flags. Saving the flags refreshes them at once (D-086).
  - DEV's `site_settings.flags` row has no `SHADOW_HOLD_NEW_USERS` key (the seed doesn't overwrite rows). It reads as off, and the first save on `/admin/settings` writes it.
  - Full E2E runs use about 28 of DEV's 30 magic-link verifications per 5 minutes: space runs 5+ minutes apart, and prefer `--workers=4` (D-089).
  - Forum lists and thread pages serve stale data for one request after their 30 s cache expires (stale-while-revalidate, D-064). Rows changed directly in the database show up on the next load.

## Owner setup (docs/SETUP.md) → needed by
- [x] Node 24.18 LTS, pnpm 12.21 (corepack, D-003), Git 2.55, Playwright Chromium; `CRON_SECRET` + `ANON_HASH_SALT` in `.env.local`
- [x] `.mcp.json` has the DEV ref. [ ] Sign in to Supabase + Vercel MCP (`/mcp`)
- [x] Supabase DEV keys + access token (with database write). [ ] DEV auth URLs, Google + Discord OAuth. [ ] PROD project → **Phase 11**
- [x] Upstash Redis. [x] Turnstile keys. [ ] Resend key + verified domain + Supabase SMTP → before launch (newsletter is DEV-only until then)
- [ ] Twitch app + YouTube key (code is ready; empty keys degrade safely, see Phase 5 to-dos). Anthropic key + spend limit → **before launch** (Phase 6 code is ready; see its owner to-dos). Voyage key + limit → **Phase 7**
- [ ] Domain (no "GTA", "Rockstar" or "Vice City") → **Phase 9/11**. Sentry → **Phase 9**. Vercel → **Phase 11**
- [x] `.env.local`: `SEED_ADMIN_EMAIL` set. [ ] Check `ADMIN_EMAIL` and `WIKI_CONTACT_EMAIL`

## Build plan (phase · SPEC sections · deliverables)

### 1 · Scaffold, design system, layout · §1 routes/nav, §2, §3 (mock data), §16 · Prompt 1
- [x] Next 16.4.6 + TS 6.0.3 strict + `src/` + pnpm 12, scaffolded in a temp dir and merged (D-025, D-034); Tailwind 4.3; shadcn 4.23 init (Radix)
- [x] Leonida Dusk tokens: dark default, light, system-following, no flash (D-006, D-028); AA contrast unit test (D-007)
- [x] Fonts; `src/env.ts` + `src/env.client.ts` (D-023, D-027); `config/{site,nav,tags}.ts` with `LAUNCH_AT` (D-020)
- [x] Shell: desktop header, mobile header + bottom tabs + More sheet, footer disclaimer (rule 3), skip link (D-031)
- [x] §2 components, incl. MarkdownRenderer (gfm, sanitize, callouts, `||spoiler||`, anchors, D-035) + `/admin/ui` (dev only, D-032)
- [x] Original logo mark + favicons (D-036); home (§3) with `[SAMPLE]` data + empty states (D-030); a stub page for every §1 route
- [x] ESLint flat config (`eslint .`), Prettier, Vitest, Playwright (390×844 + 1440×900) + smoke E2E, GitHub Actions CI

### 2 · Database, RLS, auth, profiles · §9, §11, §15 (RLS) · Prompt 2
- [x] Supabase CLI (D-008) linked to DEV through the guard (D-040); migrations: every §11 table, check, index (HNSW, GIN, trigram), trigger, function, `public_profiles`, buckets
- [x] RLS on every table + 48 DB tests (D-043); `seed.sql` (categories, tags, reserved names, settings + flags D-018, admin promote D-041); `pnpm db:types`
- [x] `@supabase/ssr` + `src/proxy.ts` (`getClaims()`, onboarding redirect); /sign-in, /auth/callback (no open redirect), /onboarding (username live check, 16+, terms, Turnstile)
- [x] `getSession`/`requireUser`/`requireRole`; `/admin/*` ≥ mod; `/u/[username]`; `/settings` (avatar → WebP, prefs, export, delete); E2E #1

### 3 · Content system + CMS · §4, §10 (dashboard, articles, launch), §13 (article SEO) · Prompt 3
- [x] `server/articles` queries + zod mutations; publish → `updateTag` / `revalidateTag(…, "max")` (D-050, D-051), embed stub, IndexNow; scheduled-publish cron (D-052)
- [x] /tips, /features, /facts indexes (tags, spoiler-free default, sort, cursor + `<a>` fallback) + the §4 article template with JSON-LD and OG
- [x] /online coming-soon + waitlist; newsletter double opt-in (the digest list reuses it, D-054); /launch + `launch_facts`
- [x] /admin dashboard skeleton, article list + editor (Quick Tip at 390px; full mode, 5 s autosave, unsaved guard, D-057), /admin/launch
- [x] Dev-only `[SAMPLE]` drafts (`scripts/seed-dev.ts`); E2E #6, #7

### 4 · Help Forum · §5 (AI answer comes in Phase 8) · Prompt 4
- [x] `server/forum`: threads/posts (30-min edit, soft delete, D-061), votes, hot rank SQL, sorts (D-017, D-064), accept → solved, mentions, quote (D-065), reputation, new-account limits + links at rep ≥ 20 in the DB (D-062)
- [x] /forum, /forum/[category], /forum/t/[id]/[slug], /forum/new (trigram "similar threads", D-068); Online category gated by flag (D-066)
- [x] Turnstile + rate limits on writes (D-063); block; report dialog; QAPage / DiscussionForumPosting; noindex (D-067); bell; `onThreadCreated()` hook; E2E #2 (without AI)

### 5 · Clips · §6 · Prompt 5
- [x] `resolveClip` (both Twitch URL shapes; YouTube watch, youtu.be, shorts; TikTok oEmbed) + fixtures; Twitch token in Redis; GTA VI game-id check; embeddable + ≤ 60 s (D-070, D-071)
- [x] /clips/submit, /clips (filters, sorts D-022, votes), /clips/[id] (VideoObject, creator credit, removal link), /clips/top/[week]
- [x] twitch-clips + weekly-clips crons (D-012); ClipEmbed facade (notice, `parent=` hosts, nocookie, TikTok on demand); CSP frame-src (D-073 to D-075)
- [x] /admin/clips (tap, A/R keys, source filter); E2E #4 with mocked APIs (D-073, D-076)

### 6 · Moderation & safety · §5 (safety), §8.2, §10 · Prompt 6
- [x] AI pre-check (Haiku 5.5, `messages.parse` + zod, 4 s timeout, fallback rule, D-011) on thread/post/clip/bio and edits (D-016, D-078 to D-081); live check waits for the key
- [x] /admin/moderation (Held · Reports · Actions), ban dialog, audit log; /admin/users; flags screen; shadow-hold flag; Community Guidelines draft; E2E #3 (D-082 to D-089)

### 7 · Wiki ingestion + embeddings ⚡ · §7 · Prompt 7
- [ ] `config/sources.ts` + licence guard test; confirm the real category names through each API first
- [ ] Ingest script + time-boxed cron (D-013): wtf_wikipedia, spoiler sections, chunker, Voyage (D-010), upsert/delete, `ingest_runs`, etiquette
- [ ] Fill the embed stub for articles and accepted answers (D-021); /admin/wiki; /credits; a real DEV run (200 pages)

### 8 · Ask AI + forum suggestions + content gaps ⚡ · §8.1, §5 (AI answer), §10 (gaps) · Prompt 8
- [ ] Hybrid retrieval (RRF k=60, trust boosts, ≤ 2 per page, top 8, spoiler filter) + tests; streamed answer with the §8.1 prompt; `ASK_MIN_SCORE` short-circuit
- [ ] /api/ask (limits, 6 h cache, ask_logs); /ask + AskBox everywhere; citations, licences, 👍/👎, "Ask the community"
- [ ] `onThreadCreated()` AI suggestion; /admin/gaps; MSW mocks; 15-question eval; E2E #5 + the AI part of #2

### 9 · SEO, PWA, analytics, legal, performance · §13, §14 · Prompt 9
- [ ] Metadata audit, canonicals, noindex, sitemaps, rss, robots, JSON-LD tests, `/api/og`
- [ ] PWA via `@serwist/turbopack` (D-009); Vercel Analytics events; Sentry client/server/edge (check Turbopack source maps)
- [ ] Security headers + CSP (D-014); legal pages; /dmca form → reports + email
- [ ] Budgets (D-026), Lighthouse mobile ≥ 95, axe with 0 serious issues

### 10 · QA hardening · §15 · Prompt 10
- [ ] All E2E (mobile + desktop); RLS attacks; auth/zod/rate-limit/Turnstile audit; XSS payload list; open redirects; cron secret
- [ ] Abuse cases; empty states; visual QA at 390/1440 in dark and light; `docs/RUNBOOK.md`; go/no-go list

### 11 · Production deploy · §12 · Prompt 11
- [ ] `docs/DEPLOY.md`; PROD Supabase gets migrations + seed only, plus auth config; re-link the CLI to DEV afterwards
- [ ] Vercel env (Preview → DEV), domain + www, crons (Pro) or GitHub Actions; `NEXT_PUBLIC_SITE_HOSTS`
- [ ] Prod smoke test, Sentry test error, Search Console + Bing, IndexNow key

### 12 · Search, email notifications, digest (post-launch) · §1 (/search), §9 · Prompt 12
- [ ] /search (FTS + trigram, tabs, highlights, ⌘K); notify-email cron; weekly digest + admin preview

### 13 · Launch content drafts (separate session, Wed) · Prompt 13
- [ ] Launch facts, 10 facts, 6 feature explainers, 5 pre-launch tips: all `draft`, official sources only

## Risks
1. **Time:** 12 phases in about 36 h. Connect the GitHub repo to Vercel right after Phase 1, so every phase gets a preview deploy on DEV and Phase 11 is mostly config.
2. **Unlock time:** if consoles unlock at regional midnight, New Zealand starts around Wed 18 Nov 16:30 IST, so aim to be live before then (Q2).
3. **Versions moved past the kit:** Next 16 (proxy.ts, the `revalidateTag` profile arg, no `next lint`, Turbopack builds), TS 7 (D-004), pnpm 12 build approvals (D-003).
4. **Turbopack:** Serwist needs its Turbopack package (D-009). Sentry source maps under Turbopack aren't confirmed, so check them in Phase 9; the fallback is `next build --webpack`.
5. **Contrast:** the SPEC accents fail AA as text in the light theme, violet fails on dark cards, and white labels fail on the dusk gradient (D-007).
6. **Haiku 5.5 thinks by default**, and thinking counts toward SPEC's 700-token cap, so answers could get cut off (D-011).
7. **External APIs:** Fandom's ToS and possible bot blocking, unverified wiki category names, and how many GTA VI clips Twitch has on day 1. Phases 5 and 7 check these against the live APIs.
8. **Cost and abuse:** set Anthropic + Voyage spend limits before launch; rate limits + Turnstile on every public write.
9. **Hosting:** Vercel Hobby is non-commercial only and limits crons, so it needs the GitHub Actions cron fallback, which can lag by minutes (Q3).
## SPEC ambiguities → proposed resolution
- Clip category `glitch-funny` (§6) vs `glitch` (§1, §11) → D-015
- `held` exists in §11 but not in the §5 states, clips or bios → D-016
- AI posts vs `reply_count`, "Unanswered" and the thin-thread noindex rule ("for 7 days") → D-017
- Feature flags live in `site_settings` but Phases 3–4 need them before Phase 6 builds the screen → D-018
- Routes missing from §1 (`/online/[slug]`, guides); `/search` is listed in §1 but built post-launch → D-019
- `LAUNCH_AT` has no time or timezone → D-020
- §7 says wiki-sync is POST, but Vercel Cron sends GET; 500 pages at 1 rps outlasts a function run → D-012, D-013
- "Strict CSP" (nonces) conflicts with ISR → D-014
- Embedding "enqueue" without a queue → D-021. Clip Hot and clip of the day are undefined → D-022
- Which env vars are required → D-023. +15 rep for user tips, but there's no submission flow → D-024

## Open questions for the owner
- **Q1.** Anonymous Ask AI at launch? The seed has `FEATURE_ASK_ANON` off, so logged-out visitors can't use the home AskBox. Proposal: turn it on, with Turnstile + 5/day + a spend cap (Haiku costs about $0.001 per answer).
- **Q2.** Exact unlock time: regional midnight, or one global time? It drives the countdown.
- **Q3.** Vercel Hobby (non-commercial) or Pro (needed before ads or affiliate links, and allows frequent crons)?
- **Q4.** Domain name (sets `NEXT_PUBLIC_SITE_URL`, the site hosts and `EMAIL_FROM`).
- **Q5.** After reading Fandom's ToS: a scheduled wiki sync, or manual runs only?
