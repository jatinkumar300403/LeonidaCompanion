# PROGRESS — Leonida Atlas

Launch: **Thu 19 Nov 2026**. Last updated: 2026-11-18 (Phase 3). Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md` (D-xxx).
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
- **Done: Phase 4 (in progress, see below).** Help forum (D-061 to D-069): 1 migration on DEV (edit window, new-account limits and links in the DB, quote replies + `post_reply`, thread mentions, `similar_threads`, `threads.excerpt`), `server/forum` (cached reads, viewer overlay, actions), `/forum`, `/forum/[category]`, `/forum/t/[id]/[slug]`, `/forum/new`, report/block, the header bell, home "Trending" on real data, profile threads + report/block.
  - Checks: `pnpm typecheck` and `lint` pass; `pnpm test` 464 unit tests; `pnpm test:db` 63 tests (12 new); `e2e/forum.spec.ts` 4/4 (E2E #2 without AI on mobile + desktop).
  - **Not yet done:** visual QA at 390/1440 in dark and light (only `/forum` and the thread page at 1440 light were checked), the full `pnpm e2e` regression run, and `pnpm format:check` on docs.
- **Next:** finish Phase 4's visual QA + full E2E run, then Phase 5 (Clips).
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
  - Sample clips use fake ids, so a loaded embed shows the platform's "unavailable" message. TikTok shows "Watch on TikTok" until Phase 5 adds `embed.js`.
  - ESLint 9 shows npm's deprecation warning. It stays until the plugins support ESLint 10 (D-034).
  - The Supabase and Vercel MCP servers still need the owner's sign-in. Context7 and Playwright work. Phases 2–3 used the Supabase CLI and the Management API instead.
  - Rows changed directly in the database skip the cache tags, so public pages show them within 10 minutes (D-051). `pnpm test:cleanup` deletes test articles the same way.
  - `pnpm seed:dev` prints Node's "module type" warning (the repo has no `"type": "module"`). It is harmless.
  - `next dev` regenerates a managed `AGENTS.md`; it is gitignored (D-060).
  - The OG image uses the default font, not Bricolage Grotesque (Phase 9 can load the font file).

## Owner setup (docs/SETUP.md) → needed by
- [x] Node 24.18 LTS, pnpm 12.21 (corepack, D-003), Git 2.55, Playwright Chromium; `CRON_SECRET` + `ANON_HASH_SALT` in `.env.local`
- [x] `.mcp.json` has the DEV ref. [ ] Sign in to Supabase + Vercel MCP (`/mcp`)
- [x] Supabase DEV keys + access token (with database write). [ ] DEV auth URLs, Google + Discord OAuth. [ ] PROD project → **Phase 11**
- [x] Upstash Redis. [x] Turnstile keys. [ ] Resend key + verified domain + Supabase SMTP → before launch (newsletter is DEV-only until then)
- [ ] Twitch app + YouTube key → **Phase 5**. Anthropic key + spend limit → **Phase 6**. Voyage key + limit → **Phase 7**
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
- [ ] `resolveClip` (both Twitch URL shapes; YouTube watch, youtu.be, shorts; TikTok oEmbed) + fixtures; Twitch token in Redis; GTA VI game-id check; embeddable + ≤ 60 s
- [ ] /clips/submit, /clips (filters, sorts D-022, votes), /clips/[id] (VideoObject, creator credit, removal link), /clips/top/[week]
- [ ] twitch-clips + weekly-clips crons (D-012); ClipEmbed facade (notice, `parent=` hosts, nocookie, TikTok on demand); CSP frame-src
- [ ] /admin/clips (tap, A/R keys, source filter); E2E #4

### 6 · Moderation & safety · §5 (safety), §8.2, §10 · Prompt 6
- [ ] AI pre-check (Haiku 5.5, `messages.parse` + zod, 4 s timeout, fallback rule, D-011) on thread/post/clip/bio (D-016)
- [ ] /admin/moderation (Held · Reports · Actions), ban dialog, audit log; /admin/users; flags screen; shadow-hold flag; Community Guidelines draft; E2E #3

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
