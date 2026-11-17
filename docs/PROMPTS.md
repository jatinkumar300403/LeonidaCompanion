# Claude Code prompt sequence: Leonida Atlas (website)

Paste these into Claude Code **one at a time, in order**. Each one is sized to finish in a single session.

**How to run each prompt**
- Run `/clear` before every new prompt. CLAUDE.md, SPEC.md and PROGRESS.md carry the context between sessions.
- For prompts marked 🧭, press **Shift+Tab** to enter plan mode first, read the plan, then approve.
- Don't start the next prompt until the current one says the build and tests pass and it has committed.
- If something breaks, use the **Fix-it prompt** at the bottom.

**Priority to hit 19 Nov**

| # | Prompt | Must-have for launch? | When (IST) |
|---|---|---|---|
| 0 | Kickoff & plan | ✅ | Tue night |
| 1 | Scaffold + design system + layout | ✅ | Tue night |
| 2 | Database, RLS, auth, profiles | ✅ | Tue night / Wed early |
| 3 | Content system + admin CMS | ✅ | Wed morning |
| 4 | Forum | ✅ | Wed midday |
| 5 | Clips | ✅ | Wed afternoon |
| 6 | Moderation & safety | ✅ (basic) | Wed afternoon |
| 7 | Wiki ingestion + embeddings | ⚡ if time | Wed evening |
| 8 | Ask AI + AI forum suggestions + content gaps | ⚡ if time | Wed evening |
| 9 | SEO, PWA, analytics, legal, performance | ✅ | Wed night |
| 10 | QA hardening | ✅ | Wed night |
| 11 | Deploy to production | ✅ | Thu early morning |
| 12 | Search, notifications, newsletter | Day 2–3 | Fri |
| 13 | Launch content drafts | ✅ | Parallel, Wed |

If you fall behind, ship 0–6 and 9–11 on launch day, then add 7–8 on the 20th. The site works fine without Ask AI for a day.

---

## Prompt 0 — Kickoff & plan 🧭

```
Read CLAUDE.md, docs/SPEC.md and docs/CONTENT_GUIDE.md fully.

Then:
1. Confirm the MCP servers are available (context7, playwright, supabase, vercel). Tell me which are missing; don't stop for them.
2. Use Context7 to check the CURRENT stable versions and setup APIs for: Next.js (App Router), Tailwind CSS v4,
   shadcn/ui, @supabase/ssr, @supabase/supabase-js, @anthropic-ai/sdk, Serwist (Next integration), @upstash/ratelimit,
   Resend, Sentry for Next.js, Vitest, Playwright, wtf_wikipedia. List them in docs/DECISIONS.md with one line each.
3. Produce a build plan that maps SPEC sections to the phases below, with risks and anything in SPEC that is ambiguous.
   Phases: 1 scaffold/design, 2 db/auth, 3 content/CMS, 4 forum, 5 clips, 6 moderation, 7 wiki ingestion,
   8 Ask AI, 9 SEO/PWA/legal, 10 QA, 11 deploy, 12 search/notifications/newsletter.
4. Create docs/PROGRESS.md with that checklist, and docs/DECISIONS.md.
Don't write app code yet. Keep the plan under 120 lines.
```

---

## Prompt 1 — Scaffold, design system, layout shell 🧭

```
Phase 1. Follow CLAUDE.md. SPEC sections: §1 (routes/nav), §2 (design system), §3 (home layout only), §16 (structure).

Build:
- New Next.js app (TypeScript strict, App Router, src/ dir, pnpm), Tailwind v4, shadcn/ui initialised and restyled to
  the "Leonida Dusk" tokens (dark default + light theme, system-following toggle, no flash on load).
- next/font: Bricolage Grotesque (display), Inter (body), JetBrains Mono (numbers).
- src/env.ts with zod validation of every variable in .env.example (server vs client split). Missing optional
  integrations must degrade gracefully (feature hidden + console warning), not crash.
- src/config/site.ts (name from NEXT_PUBLIC_SITE_NAME, default "Leonida Atlas"; LAUNCH_AT = 2026-11-19), nav.ts, tags.ts.
- Layout: desktop header, mobile compact header + bottom tab bar + "More" sheet, footer with the exact disclaimer text
  from CLAUDE.md rule 3. Skip-to-content link.
- Components from SPEC §2 with placeholder data: Button/Badge/Card variants, StatusBadge, SpoilerBlock (+ inline),
  TipCard, FeatureCard, FactCard, ThreadRow, VoteButtons (UI only), ClipCard + ClipEmbed facade (UI only), AskBox,
  AnswerCard (static), MarkdownRenderer (remark-gfm, rehype-sanitize, callouts, ||spoiler|| syntax, headings with anchors),
  CountdownOrStatus, EmptyState, ErrorState, Skeletons.
- An original logo mark (simple SVG: abstract sun over water/palm, in the dusk gradient; no Rockstar-like styling)
  and a favicon set.
- Home page (§3) with all 8 blocks using mock data and real empty states.
- /admin/ui showcase page listing every component in every state (temporarily public in dev only).
- Stub pages for every route in §1 (title + EmptyState) so nav never 404s.
- Tooling: eslint, prettier, vitest (+ a token-contrast test asserting AA), playwright config with mobile + desktop
  projects, scripts from CLAUDE.md, GitHub Actions CI (typecheck, lint, test, build).

Finish: run typecheck/lint/test/build, open /, /admin/ui and /tips with the Playwright MCP at 390px and 1440px, fix
anything ugly or broken, update PROGRESS.md, commit "feat: scaffold, design system and layout".
```

---

## Prompt 2 — Database, RLS, auth, profiles 🧭

```
Phase 2. SPEC §9 (auth/profiles), §11 (database + RLS + storage + seed).

- Supabase CLI setup: link to the DEV project (ref in SUPABASE_PROJECT_REF_DEV). Write migrations in
  supabase/migrations for ALL tables, enums/checks, indexes (HNSW on knowledge_chunks.embedding, GIN on tsvectors,
  trigram on usernames/titles), triggers and SQL functions listed in §11, RLS policies for every table,
  the public_profiles view, and storage buckets + policies. Push with `pnpm db:push`. Generate types (`pnpm db:types`).
- supabase/seed.sql: forum categories (§5), tags, site_settings defaults (feature flags off, launch_facts skeleton),
  promote SEED_ADMIN_EMAIL to admin when that user exists.
- Auth with @supabase/ssr: middleware session refresh, /sign-in (magic link + Google + Discord buttons), /auth/callback,
  /onboarding (username with live availability check, display name, platform, "I am 16 or older" checkbox,
  Terms + Guidelines checkbox, Turnstile). Users without a completed profile are redirected to /onboarding.
- Role helpers: getSession(), requireUser(), requireRole('mod'|'admin') in src/server/auth.
- /u/[username] public profile and /settings (edit profile, avatar upload with client-side square crop + WebP,
  notification prefs, export my data as JSON, delete account flow from §9).
- Lock /admin/* behind requireRole('mod').
- RLS tests in supabase/tests (or vitest against DEV with seeded test users) covering every rule in §11.

Finish: all tests green, Playwright E2E #1 (sign-up flow, with magic link mocked in test mode), build passes,
PROGRESS.md updated, commit "feat: database, RLS, auth and profiles".
```

---

## Prompt 3 — Content system + admin CMS 🧭

```
Phase 3. SPEC §4 (content), §10 (admin: dashboard skeleton, articles, launch editor), §13 (article-level SEO bits).

- src/server/articles: queries (by type/tag/spoiler filter, cursor pagination, related by tags), mutations with zod,
  publish pipeline (revalidateTag, enqueue embedding job — implement embedding as a no-op stub that phase 7 fills in,
  IndexNow ping when INDEXNOW_KEY set), scheduled publishing route /api/cron/publish-scheduled.
- Public pages: /tips, /features, /facts, /online (coming soon + waitlist form → newsletter_subscribers with list
  online_waitlist, double opt-in email via Resend), /launch (launch article + launch_facts blocks with sources), and the
  article page template exactly as §4 (TOC, sources box, helpful vote with anon hashing + rate limit, related,
  CTAs, JSON-LD Article/FAQPage/BreadcrumbList, generateMetadata, OG via /api/og).
- Section index pages: tag chips, spoiler-free toggle (default on), sort, infinite scroll with <a> fallback.
- /admin dashboard skeleton, /admin/articles list + editor:
  * Quick Tip mode (title, 2–5 sentence body, optional source URL, tags, spoiler level → Publish) — must be fast and
    comfortable on a 390px phone.
  * Full mode: MarkdownEditor with toolbar + live preview tab, cover image upload to article-images, sources editor,
    fact_status (required + source required when confirmed), spoiler level, schedule, Google-snippet preview,
    autosave every 5s, unsaved-changes guard.
  * /admin/launch editor for site_settings.launch_facts.
- Seed 3 sample DRAFT articles per type (clearly marked "[SAMPLE]") for dev only (scripts/seed-dev.ts), never in prod.

Finish: Playwright E2E #6 (quick tip from phone viewport) and #7 (spoiler), build, Playwright MCP visual check of an
article page at 390/1440 in both themes, PROGRESS.md, commit "feat: content system and admin CMS".
```

---

## Prompt 4 — Help Forum 🧭

```
Phase 4. SPEC §5 entirely (except AI suggested answers, which phase 8 adds — leave a clearly named hook
`onThreadCreated()` that phase 8 will fill).

- src/server/forum: create/edit/delete thread & post (edit window rules, soft delete), votes (optimistic UI,
  toggle), hot ranking SQL, sorting (hot/new/top day|week|all/unanswered), accept answer (author or mod) → solved,
  mentions → notifications rows, quote reply, reputation triggers, new-account limits, link restriction under rep 20,
  Turnstile + Upstash rate limits on every write.
- Pages: /forum (categories with counts + hot threads + unanswered), /forum/[category], /forum/t/[id]/[slug]
  (question, pinned accepted answer, replies, reply composer using MarkdownEditor, spoiler handling: Missions & Story
  auto spoiler warning, is_spoiler blur in lists), /forum/new (category picker, title, body, tags, spoiler toggle,
  "similar threads" suggestions as the user types the title via trigram search — reduces duplicates).
- Online category locked/read-only unless FEATURE_ONLINE.
- Block user, report (dialog with reasons from §5) — reports just insert rows here; the queue UI comes in phase 6.
- JSON-LD QAPage / DiscussionForumPosting, noindex rules for thin threads (§13).
- Notification bell in the header (unread count, dropdown list, mark all read). Email sending comes in phase 12.

Finish: Playwright E2E #2 (without the AI part), build, visual check of the thread page at 390/1440, PROGRESS.md,
commit "feat: help forum".
```

---

## Prompt 5 — Clips 🧭

```
Phase 5. SPEC §6 entirely. Golden rule: embed only, never download or proxy video.

- src/server/clips/resolve.ts: URL parsers for Twitch (both URL shapes), YouTube (watch, youtu.be, shorts, with params),
  TikTok; metadata fetchers (Twitch Helix with cached app access token in Upstash, YouTube Data API v3,
  TikTok oEmbed). Twitch GTA VI game-id resolution via /helix/games?name=Grand Theft Auto VI (cache, env override
  TWITCH_GTA6_GAME_ID) and reject non-GTA VI clips. Reject non-embeddable YouTube videos and > 60s durations.
  Full unit tests with recorded fixtures (no live network in tests).
- /clips/submit: paste URL → live preview card from resolveClip → category + caption + "not a story spoiler" checkbox
  → submit (Turnstile, rate limit, dedupe) → pending.
- /api/cron/twitch-clips: top GTA VI clips from the last 24h (first=50) inserted as pending/twitch_auto (dedupe).
- /clips feed (filters, Hot/New/Top week, votes), /clips/[id] page (embed, creator credit + "Watch on <platform>",
  VideoObject JSON-LD, "I'm the creator — remove this" link to /dmca prefilled), /clips/top/[week] +
  /api/cron/weekly-clips freezing the snapshot into clip_weekly.
- ClipEmbed facade: thumbnail via next/image (add remotePatterns for the platform thumbnail CDNs), first-click embed
  notice remembered in localStorage (try/catch), Twitch iframe with parent= every host in NEXT_PUBLIC_SITE_HOSTS +
  localhost + VERCEL_URL host, youtube-nocookie, TikTok embed.js on demand.
- /admin/clips queue: pending list with inline embed preview, approve/reject (with reason) by tap, A/R keyboard
  shortcuts, filter by source (user/twitch_auto).
- Add the iframe hosts to the CSP frame-src.

Finish: Playwright E2E #4 (APIs mocked), build, visual check of /clips at 390/1440, PROGRESS.md,
commit "feat: clips with official embeds".
```

---

## Prompt 6 — Moderation & safety 🧭

```
Phase 6. SPEC §5 (safety list) and §8.2 (AI moderation), §10 (moderation queue, users, feature flags).

- src/server/moderation/ai.ts: Anthropic call with ANTHROPIC_MODEL_FAST returning strict JSON per §8.2 (validate with
  zod; on parse failure or 4s timeout apply the fallback rule). Prompt lives in src/server/ai/prompts.ts.
  Unit tests with mocked responses for each label.
- Wire it into thread, post, clip submit and bio update: allow / hold (status 'held', user sees "pending review",
  self_harm also creates an admin notification) / reject (friendly error, untagged_spoiler message tells them to add
  a spoiler tag).
- /admin/moderation: tabs Held · Reports · Recent actions. One-tap remove/restore/approve/dismiss, lock, move,
  ban dialog (temp/perm + reason). Every action writes moderation_actions.
- /admin/users: search, view activity, role change (admin only), ban/unban.
- /admin settings: feature flags (FEATURE_ONLINE, FEATURE_ADS, FEATURE_ASK_ANON, MAINTENANCE_MODE) stored in
  site_settings and read through a cached getFlags().
- Community Guidelines page content (draft, plain English) per §14.
- Shadow-hold option for new users when the site is under spam attack (flag).

Finish: Playwright E2E #3, build, PROGRESS.md, commit "feat: moderation and safety".
```

---

## Prompt 7 — Wiki ingestion + embeddings 🧭

```
Phase 7. SPEC §7 entirely. Licence rules in CLAUDE.md rule 4 are mandatory.

- src/config/sources.ts exactly as SPEC, plus a guard that throws if a commercialUse:false source is enabled while
  SITE_COMMERCIAL=true (unit test).
- Before coding, use the MediaWiki API of each enabled source (via fetch in a scratch script) to confirm the real
  GTA VI category names and adjust seedCategories. Report what you found.
- scripts/ingest-wiki.ts + /api/cron/wiki-sync (CRON_SECRET): category crawl (depth 2) + search, batched revision fetch,
  skip unchanged revisions, wtf_wikipedia cleaning, spoiler detection (section names Plot/Story/Ending/Synopsis →
  is_spoiler), heading-aware chunker (350–500 tokens, 60 overlap, breadcrumb), Voyage embeddings (document input type,
  batch 64, retry/backoff), upsert knowledge_chunks with license + attribution, delete chunks for deleted pages,
  ingest_runs summary. Etiquette from §7 (User-Agent with WIKI_CONTACT_EMAIL, ≤1 rps, maxlag, page cap).
- Fill the phase-3 stub: published articles and accepted forum answers get chunked + embedded on publish/accept
  (and removed on unpublish/unaccept).
- /admin/wiki: runs table, counts per source, Run now, enable toggles (respecting the licence guard).
- /credits page listing every enabled source with name, link, licence and attribution text.

Run a real ingestion against DEV with WIKI_MAX_PAGES_PER_RUN=200, show me the summary and 3 sample chunks.
Finish: tests, build, PROGRESS.md, commit "feat: licence-aware wiki ingestion and embeddings".
```

---

## Prompt 8 — Ask AI, AI forum suggestions, content gaps 🧭

```
Phase 8. SPEC §8.1 entirely, §5 (AI suggested answer), §10 (content gaps).

- src/server/ask/retrieve.ts: hybrid retrieval (pgvector top 20 + FTS top 20 via the SQL functions), RRF k=60,
  trust boosts, max 2 chunks per source page, top 8, spoiler filter. Unit-test the RRF + boosts + per-page cap.
- src/server/ask/answer.ts: Anthropic streaming with the exact system prompt from SPEC §8.1, numbered sources block,
  max_tokens 700. If top score < ASK_MIN_SCORE: skip the model call and return the "Not confirmed yet" response with
  forum CTA (saves cost, avoids guessing).
- /api/ask route (streaming), limits (anon 5/day with Turnstile + FEATURE_ASK_ANON, signed-in 30/day, admin unlimited),
  6h Redis answer cache, ask_logs with token counts + latency.
- /ask page + AskBox everywhere: streaming AnswerCard, citation chips with title/source/licence popover, Sources list
  with attribution lines, spoiler toggle, 👍/👎, Copy, "Ask the community" → /forum/new prefilled with question + quoted
  answer. Suggested questions on empty state.
- Fill onThreadCreated(): for Help & Questions threads, run retrieval on title+body inside after(); if score ≥
  ASK_MIN_SCORE insert an is_ai post labelled "AI suggestion · may be wrong" with sources. Never auto-accept.
- /admin/gaps: low-score + 👎 questions clustered (greedy, cosine ≥ 0.85), counts, "Write a tip" → editor prefilled.
- Mock Anthropic + Voyage in tests (MSW). Add a tiny eval: 15 Q&A pairs in e2e/fixtures/ask-eval.json run against DEV
  data, reporting citation presence and "Not confirmed yet" behaviour for 5 unanswerable questions.

Finish: Playwright E2E #5 and the AI part of #2, build, PROGRESS.md, commit "feat: Ask AI with citations".
```

---

## Prompt 9 — SEO, PWA, analytics, legal, performance 🧭

```
Phase 9. SPEC §13, §14, plus the security headers.

- generateMetadata audit on every route; title pattern; canonicals; noindex rules; sitemap index + per-section sitemaps
  with lastmod; rss.xml; robots.txt; WebSite+SearchAction JSON-LD on home; validate all JSON-LD with a unit test
  against schema shapes.
- /api/og dynamic images (dusk gradient, section label, title, site name), cached.
- Serwist PWA: manifest, maskable icons from the logo mark, offline page, caching strategies per §13, custom install
  banner after 2nd visit, `pwa_installed` event.
- Vercel Web Analytics + the custom events in §13. Sentry (client + server + edge), source maps uploaded in CI only.
- Security headers + strict CSP (next.config / middleware) — make sure Turnstile, embeds, Supabase storage, Vercel
  analytics and Sentry still work.
- Legal pages from §14 as clear plain-English drafts with a visible "Last updated" date: disclaimer, privacy, terms,
  community guidelines (exists), DMCA/removal form (stores to reports with target_type 'dmca' + emails admin via
  Resend), credits (exists), contact, optional impressum.
- Performance pass: check bundle sizes per route, move anything possible to server components, lazy-load heavy
  client bits (editor, embeds), image sizes, font subsetting. Hit the §13 budgets.

Finish: Lighthouse (mobile) on /, a tip page, /forum, /clips — report scores, fix until ≥ 95 where feasible; axe scan
0 serious; build; PROGRESS.md; commit "feat: SEO, PWA, analytics, legal, performance".
```

---

## Prompt 10 — QA hardening 🧭

```
Phase 10. Act as a strict reviewer of this codebase before launch.

1. Run the whole test suite and all E2E flows in SPEC §15 on mobile + desktop projects; fix failures.
2. Security review: try to break RLS (anon and normal-user clients attempting writes/reads they shouldn't),
   check every server action and route handler for auth, zod validation, rate limiting and Turnstile where required,
   check no service-role import reaches client bundles, check markdown sanitisation with an XSS payload list,
   check open redirects in auth callback, check CRON_SECRET on all cron routes.
3. Abuse cases: 100 rapid posts, huge bodies, unicode/RTL usernames, link spam from new accounts, duplicate clip
   submits, Ask AI prompt-injection attempts in the question ("ignore your sources…") — answers must stay grounded.
4. Empty-state review: the site with zero content must still look intentional on every page.
5. Visual QA with Playwright MCP: every top-level route at 390px and 1440px, dark and light. List issues, fix them.
6. Write docs/RUNBOOK.md: how to publish a quick tip, approve clips, handle a report/DMCA, run wiki sync, flip
   FEATURE_ONLINE, rotate keys, what to do if Anthropic/Voyage/Twitch is down.

Commit "chore: launch QA hardening" and give me a short go/no-go list.
```

---

## Prompt 11 — Production deploy 🧭

```
Phase 11. Deploy to production.

1. Create docs/DEPLOY.md with the exact steps, then do the parts you can via the Vercel MCP/CLI and tell me precisely
   which dashboard clicks I must do myself.
2. PROD Supabase: link a second project (SUPABASE_PROJECT_REF_PROD) ONLY for `supabase db push` of migrations + seed
   (no sample content). Configure auth redirect URLs (prod domain, www, Vercel preview wildcard), Google/Discord
   providers, Resend SMTP, email templates. Then re-link the CLI to DEV.
3. Vercel: project from the GitHub repo, all env vars for Production and Preview (Preview uses DEV Supabase),
   domain + www redirect, crons in vercel.json (or the GitHub Actions fallback if on Hobby — tell me which).
4. Twitch embed parents: NEXT_PUBLIC_SITE_HOSTS must include the prod domain and www.
5. Post-deploy smoke test with Playwright against the prod URL: home, a tip, forum thread create (test account,
   then delete), clip page, /ask, sitemap.xml, robots.txt, manifest. Sentry receives a test error.
6. Submit sitemap instructions for Google Search Console + Bing Webmaster (I'll click), IndexNow key file in /public.

Report the live URL and anything left for me to do.
```

---

## Prompt 12 — Search, notifications email, newsletter (post-launch)

```
Phase 12. SPEC §1 (/search), §9 (notifications email, newsletter digest).

- /search: unified results (articles, threads, clips) using Postgres FTS + trigram fallback, tabs per type,
  highlight matches, "Ask AI instead" CTA, track top searches for the admin dashboard. Header search with ⌘K.
- Email notifications: /api/cron/notify-email batching unread reply/mention notifications for opted-in users,
  React Email templates, List-Unsubscribe.
- Weekly digest: /api/cron/digest (top tips, threads, clips of the week), preview page in /admin, test-send to admin.
Finish: tests, build, PROGRESS.md, commit "feat: search, email notifications, digest".
```

---

## Prompt 13 — Launch content drafts (run in a separate session, in parallel)

```
Using ONLY official Rockstar Games sources (rockstargames.com, the Rockstar Newswire, official trailers' descriptions)
and the enabled licence-compatible wiki sources, create DRAFT articles (status='draft') via the admin server functions:
- /launch facts: release date, platforms, editions + prices, preload timing — each with a source URL.
- 10 'fact' articles (fact_status 'confirmed', each with ≥1 official source).
- 6 'feature' explainers for officially shown mechanics (one per mechanic, plainly marked if details are not yet
  confirmed).
- 5 beginner 'tip' drafts that are generic but true for Rockstar open-world games (e.g. settings, saving habits,
  accessibility options) clearly labelled "Pre-launch tip — will be updated after release".
Follow docs/CONTENT_GUIDE.md voice and format. No spoilers, no leaks, no speculation presented as fact.
List what you created with links to their admin edit pages so I can review and publish.
```

---

## Fix-it prompt (use any time)

```
Something is wrong: <paste the error, screenshot description or what you expected vs what happened>.
Reproduce it first (failing test or Playwright script), find the root cause, fix it with the smallest change,
keep the test, run typecheck/lint/test/build, update PROGRESS.md known issues, commit "fix: …".
```

## "Add a feature" prompt template

```
New feature: <describe>. First add a short section to docs/SPEC.md describing it (routes, data, rules), then plan,
then build it following CLAUDE.md. Include tests and a Playwright MCP visual check at 390/1440. Commit.
```

## Launch-night workflow (you, not Claude Code)
1. Watch 2–3 big streamers. Keep a notes app open.
2. Every good discovery → `/admin` → Quick Tip → publish (credit the streamer as a source with a link).
3. Every 30 min: `/admin/clips` → approve the best Twitch auto-candidates (credit is automatic).
4. Every hour: `/admin/gaps` → write a tip for the most-asked unanswered question.
5. Post 3–5 of your own short videos/posts linking to the site's tips, not to clip re-uploads.
