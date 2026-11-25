# PROGRESS — Leonida Atlas

Launch: **Thu 19 Nov 2026** (passed). **Live since 25 Nov: https://leonida-atlas-rose.vercel.app**. Last updated: 2026-11-25 (Phase 11). Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md` (D-xxx).
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
- **Done: Phase 9.**
  - SEO, PWA, analytics, legal, performance (D-091 to D-099):
    - **SEO:**
      - every page has metadata and a default `/api/og` card (in Bricolage Grotesque now);
      - `/sitemap.xml` is an index over `/sitemaps/{pages,tips,features,facts,forum,clips}.xml` with `lastmod`;
      - `/rss.xml` (spoiler-free guides), linked from every page;
      - `robots.txt`, with Preview deploys blocked.
      - Unit tests check that every route has metadata, that the private pages are noindex, and that every JSON-LD builder matches Google's required shape.
    - **PWA:**
      - the manifest, with maskable icons from the original mark;
      - the service worker at `/serwist/sw.js` with scope `/`;
      - caching per SPEC §13 (guides use stale-while-revalidate and read offline);
      - a lean precache (278 KB: CSS, Latin fonts, icons, `/offline`);
      - `/offline` lists the guides saved on the device;
      - the install banner from the 2nd visit (with an iOS hint), and `pwa_installed`.
    - **Analytics:** Vercel Web Analytics (on Vercel only) and the 8 SPEC §13 events; `thread_created` and `post_created` are sent server-side.
    - **Sentry:** client, server and edge. It does nothing without a DSN, the browser SDK loads lazily, and source maps upload from CI/Vercel only.
    - **Security:** the strict CSP (no nonces, D-014), plus HSTS, Referrer-Policy, Permissions-Policy, nosniff and X-Frame-Options.
    - **Legal:** dated drafts with a Draft badge on one `LegalPage` layout: disclaimer, privacy, terms, content removal, credits and an impressum template. Plus a contact page.
    - **`/dmca` form:**
      - anyone can send one, behind Turnstile and rate limits;
      - stored as a `dmca` report (service role);
      - the admin is emailed (dev outbox without Resend);
      - `?clip=` pre-fills the clip;
      - the Reports queue shows the clip.
    - **Performance pass:**
      - the browser Supabase client, the Turnstile widget and the signed-in account menu load on demand;
      - Serwist's 9 KB React provider was replaced by a few lines of registration;
      - a fact-card link fixed for WCAG 2.2 target size;
      - the article "Updated" line no longer shifts the page (CLS 0.2 → 0);
      - the hero grain shows from `lg` up only (Lighthouse took it as the LCP element and simulated 4.5 s).
  - **Lighthouse mobile** (production build, `pnpm lhci`, median of 3 runs):

    | Page | Performance | Accessibility | Best practices | SEO |
    | --- | --- | --- | --- | --- |
    | `/` | 100 | 100 | 100 | 100 |
    | `/tips/sample-tip-1` | 100 | 100 | 100 | 100 |
    | `/forum` | 100 | 100 | 100 | 100 |
    | `/clips` | 100 | 100 | 100 | 100 |

    LCP 1.2 s, CLS 0 and TBT 18–33 ms on all four (simulated slow 4G). Before the fixes, `/` scored 86 and the tip page 90.
  - **axe:** `e2e/a11y.spec.ts` checks 20 public pages × 2 viewports × dark and light: 0 serious or critical issues. One was fixed on the way (a fact card's source link was under 24 px).
  - **JS budget** (`e2e-prod/budgets.spec.ts`, gzipped first-load JS): 216–236 KB, down from about 300 KB. It's still over SPEC's 150 KB for article pages, because Next's router and React DOM alone are about 130 KB. The spec now fails if a page grows past 240 KB; see Known issues.
  - **Sentry source maps under Turbopack (Risk 4):** the build hook runs and injects debug IDs, and the upload was attempted with a dummy token (404, as expected). Only a real upload with the owner's token is left (D-093).
  - **Checks:**
    - `pnpm typecheck` (now also type-checks the service worker against `tsconfig.sw.json`), `lint`, `format:check` and `build` pass;
    - `pnpm test`: 789 unit tests, plus 11 live tests that skip without a key;
    - `pnpm test:db`: 87 tests;
    - `pnpm e2e --workers=4`: 154 passed, 12 viewport skips. New specs: `e2e/seo-pwa.spec.ts`, `e2e/legal.spec.ts` (the removal form, anonymous) and `e2e/a11y.spec.ts` (axe);
    - `pnpm e2e:prod` on a production build: 22 passed, 10 skips (viewport duplicates, plus the clip-player check, which needs an approved clip and DEV has none). It covers the service worker controlling `/`, offline fallback, CSP with Turnstile, and the budgets;
    - `pnpm lhci` assertions pass.
  - **Visual QA:**
    - 41 captures at 390 and 1440, dark and light, taken with a Playwright script;
    - pages: the legal pages, `/dmca` (field errors and success), `/offline` and the install banner (the prompt and the iOS hint);
    - no horizontal overflow;
    - fixes made during the check:
      - the Turnstile box on `/dmca` is reserved from the start, because mounting it on first focus pushed the Send button down, so a first click on Send missed it;
      - the install banner is fully opaque;
      - the privacy page names the real "Export my data" button.
  - DEV was cleaned with `pnpm test:cleanup`: no reports, test users, E2E articles, threads or clips, and `sample-tip-1` is back to draft.
- **Done: Phase 10.**
  - QA hardening before the production deploy (D-100 to D-108). It ran as a strict review on DEV only.
  - **Security review:** every server action (11 files) and route handler (13) checked for auth, zod, rate limits, Turnstile and the maintenance flag. RLS attacked with anon and member clients. Client bundles scanned. An XSS payload list run through the markdown pipeline. Redirects and cron secrets checked. Fixes:
    - **Vote farming (D-100):** a member could retarget their own vote row, which moved no score, then vote again. Repeated, that farmed any post's score and its author's reputation, which unlocks links and skips the new-account hold. `helpful` feedback had the same gap. Fixed with a migration on DEV (`20261125090000_qa_hardening.sql`), with tests in the new `supabase/tests/attacks.test.ts` (15 attacks).
    - **Open redirect (D-103):** `/auth/callback?next=/.//evil.example` sent a freshly signed-in user off-site, because dot segments normalised to `//host` after the check. Fixed in `safeNextPath`, with unit cases, the sign-in E2E and a request-level callback E2E.
    - **Rate limits under a burst (D-105):** against real Upstash, 100 parallel calls on a cold connection all passed (Upstash's 2 s timeout fails open). Timeouts and errors now fall back to an in-process copy of the same limit. Rechecked live: every scope stops at its limit.
    - **Invisible and bidi characters (D-101):** stripped from display names, bios, thread titles and bodies, replies, report details, clip captions and the removal form. Display names render in `<bdi>`.
    - **Action input (D-102):** two Settings actions threw on crafted values (now `safeParse`). `removeAvatar` is rate-limited. The CMS actions validate their ids and intents. The reply composer shows the real field error and survives a request over 1 MB.
    - **New regression checks:**
      - `e2e-prod/bundle-secrets.spec.ts`: no server secret values or service-role code in `.next/static`, and no test mailbox in production (D-104);
      - 34 XSS payloads × 4 renderer modes (`markdown-renderer.test.tsx`);
      - JSON-LD `</script>` breakout;
      - 58 cron-route cases: every malformed or wrong bearer gets a 401 on GET and POST, and the no-key outcomes.
    - **Checked and fine:**
      - RLS already blocks un-holding your own content, moving a thread into Online, accepting a reply from another thread, replying in held, removed or locked threads, voting on hidden threads, reading other members' blocks, editing clips, resolving reports, calling the private RPCs, and deleting or overwriting another member's avatar;
      - only `src/server/admin/*` and the cron routes use the service role;
      - production refuses to boot without Upstash, Turnstile, `CRON_SECRET` and `ANON_HASH_SALT`.
  - **Abuse cases (DEV):**
    - 100 rapid requests per scope against real Upstash;
    - oversized bodies (20,001 characters → "Keep it under 20,000 characters."; 1.1 MB → refused by Next, with a friendly message; the database CHECKs also refuse them over PostgREST);
    - unicode and RTL usernames (refused) and display names (cleaned);
    - link spam from new accounts (database tests from Phase 4, plus the fallback hold);
    - duplicate clip submissions (a second URL shape is caught in the preview; two simultaneous inserts store one row).
    - **Ask AI prompt injection is skipped:** Phase 8 isn't built (open item below).
  - **No-key behaviour** (Anthropic, Voyage, Twitch, YouTube, Resend and Sentry are all empty): Twitch and YouTube links say "can't be checked yet", `twitch-clips` skips, the moderation fallback holds content with an admin banner, Sentry does nothing, and email goes to the dev outbox.
  - **Phase 9 follow-ups:** the Turnstile box is reserved on the thread, reply and clip-submit forms (D-106). `/about` is written (Draft badge, D-107).
  - **`docs/RUNBOOK.md`:** Quick Tips, clips, reports and bans, removal requests, flags, crons, key rotation and outage playbooks, plus the wiki-sync and Ask AI sections marked "after Phase 7/8".
  - **Visual QA** (a Playwright script, as in Phases 5–9): 164 captures, covering every top-level route at 390 and 1440 in dark and light, as a visitor, an admin and a new account (onboarding), all in the empty state.
    - No horizontal overflow and no 5xx anywhere.
    - **Fixed:** 404 pages inside a route group drew the header and footer twice (D-109).
    - **Harmless console noise:** Turnstile's own `data:` CSP messages (D-092) and React's dev-only "script tag" warning from next-themes on 404s.
    - The production home was captured separately: no `[SAMPLE]` content (that's dev-only), intentional empty states, no overflow.
  - **Lighthouse mobile** (production build, `pnpm lhci`, median of 3): `/`, `/tips/sample-tip-1`, `/forum` and `/clips` each score **100 / 100 / 100 / 100**, with LCP 1.2 s, CLS 0 and TBT 30–77 ms.
    - On Windows, Lighthouse must use a Chromium that Playwright launched with `--remote-debugging-port=9222`, and `lhci` has to run **asynchronously** from that script: a blocking `execSync` stalls Lighthouse's tabs (D-099).
  - **Checks:**
    - `pnpm typecheck`, `lint`, `format:check` and `build` pass;
    - `pnpm test`: 930 unit tests (141 new), plus 11 live tests that skip without a key;
    - `pnpm test:db`: 102 tests (15 new in `attacks.test.ts`);
    - `pnpm e2e --workers=4`: 158 passed, 12 viewport skips. The two load-sensitive waits were widened (D-110);
    - `pnpm e2e:prod`: 23 passed (new: the bundle-secret scan and the production test-mailbox 404);
    - `pnpm lhci` assertions pass.
  - **DEV is clean** after `pnpm test:cleanup`: no test users, threads, posts, clips, reports, audit rows, votes or feedback, no published articles, and the flags are all off. `sample-tip-1` is back to draft, and the Upstash test keys are deleted.
- **Done: Phase 11 (production deploy). Live at https://leonida-atlas-rose.vercel.app** (25 Nov 2026).
  - **Owner decisions:**
    - Vercel **Hobby**;
    - launch on the vercel.app address, with a domain later (D-114). `leonida-atlas.vercel.app` was taken, so Vercel assigned `leonida-atlas-rose`;
    - crons from GitHub Actions every 30 min (D-111). The repo was meant to be private but was created **public** (open question below).
  - **Repo side (b5908a5):**
    - `docs/DEPLOY.md`;
    - `.github/workflows/cron.yml`;
    - `pnpm db:push:prod` (D-112);
    - the robots allow for `/api/indexnow` (D-113);
    - `pnpm e2e:live`;
    - DEPLOY.md regions corrected to Tokyo (24d047e), because DEV is in `ap-northeast-1`.
  - **GitHub:** `main` pushed to `jatinkumar300403/LeonidaCompanion`. The first CI run failed in `actions/setup-node@v5`, which looked for pnpm before corepack enabled it. Fixed with `package-manager-cache: false` (0ae580d); CI is green.
  - **PROD Supabase** (`leonida-prod`, Tokyo), through `pnpm db:push:prod` (dry run, then real):
    - 14 migrations, including `20261125090000_qa_hardening.sql` (D-100), plus `seed.sql`;
    - 21 tables, all with RLS;
    - 0 articles, threads, clips and users;
    - 8 forum categories, 20 tags, 50 reserved usernames, 2 buckets;
    - flags all off;
    - the seed admin is stored;
    - the security advisor's output is identical to DEV's;
    - the CLI stayed linked to DEV, checked before and after.
  - **PROD Auth:**
    - Site URL and Redirect URLs are set to the vercel.app address;
    - DEV also allows the Vercel preview URL pattern;
    - **the magic-link template couldn't be changed:** Supabase refuses template edits on free projects using the default mailer, until custom SMTP (Resend) is set.
  - **Vercel** (`leonida-atlas`):
    - Node 24.x, functions in Tokyo (`hnd1`);
    - Claude set the non-secret env vars (Production → PROD Supabase, Preview → DEV Supabase plus Cloudflare's Turnstile test keys) and `INDEXNOW_KEY`;
    - the owner pasted the Production secrets;
    - two rows edited by mistake were restored (the Supabase URL per environment, and the Preview Turnstile keys).
  - **Checks on the live site:**
    - every main route answers 200, and the cron routes answer 401 without the bearer;
    - `robots.txt` allows `/api/indexnow`;
    - the footer disclaimer is present;
    - `pnpm e2e:live`: **12 passed**, at 390 and 1440. The 2 skipped are the forum round-trip, which needs `.env.prod.local` with the PROD keys. The tip and clip pages were skipped inside their tests, because PROD has none published yet.
- **Next after Phase 11:** Phases 7–8 (wiki ingestion, Ask AI).
  - **Open items for Phases 7–8:**
    - the Ask AI prompt-injection abuse case ("ignore your sources…" must stay grounded, rule 8);
    - the live wiki-sync runbook steps (RUNBOOK §6–7);
    - `onThreadCreated()` when a mod approves a held Q&A thread (D-080);
    - `ask_submitted` and `ask_feedback` fired from the real Ask flow.
- **Owner to-dos for Phase 11** (details in `docs/DEPLOY.md`; never paste keys in chat):
  1. **Turnstile secret:**
     - rotate it in Cloudflare;
     - in Vercel, **remove** the readable `TURNSTILE_SECRET_KEY` row (Config, Production + Preview, old value);
     - **add** a new one as **Secret**, Production only;
     - tell Claude, who re-adds the Preview test secret and redeploys.
  2. **Cloudflare → Turnstile → Hostname management:** make sure `leonida-atlas-rose.vercel.app` is listed.
  3. **Crons:** GitHub repo → Settings → Secrets and variables → Actions:
     - `PROD_SITE_URL` = `https://leonida-atlas-rose.vercel.app`;
     - `CRON_SECRET` = the Vercel Production value;
     - then Actions → Cron → Run workflow once (DEPLOY §6).
  4. **Repo visibility:** make it private (Settings → General → Danger Zone), or tell Claude to keep it public. Public allows the SPEC cron timings, because Actions minutes are unlimited.
  5. **PROD sign-in:** turn on Google and Discord in leonida-prod → Authentication → Sign In / Providers. Add `https://snesaembycvyxpvklxok.supabase.co/auth/v1/callback` to each app's redirect URLs. Until there's a domain + Resend, email sign-in only reaches Supabase project team members, and the token_hash template can't be set.
  6. **Forum smoke test:**
     - create `.env.prod.local` with `LIVE_BASE_URL`, `LIVE_SUPABASE_URL` and `LIVE_SUPABASE_SECRET_KEY` (DEPLOY §7.1);
     - ask Claude to run `pnpm e2e:live`;
     - delete the file afterwards.
  7. **Search Console + Bing** (DEPLOY §7.2), with a URL-prefix property for the vercel.app address.
  8. **Preview env:** the DEV publishable and secret keys, Upstash and the generated secrets aren't set for Preview yet, so preview builds fail. Production isn't affected.
  9. **Before inviting people:** the Anthropic key (DEPLOY §8.1). Sentry is optional.
- **Owner to-dos from Phase 10:**
  - **Review the `/about` draft**, then remove its Draft badge (`draft={false}` on its `LegalPage`). It describes the site only, not the game.
  - **Read `docs/RUNBOOK.md`** before launch day, especially §3 (reports and removal requests), §8 (key rotation) and §9 (outages).
  - **Before launch:** the Anthropic key (Phase 6 to-dos) is the biggest gap. Without it, nearly every new member's posts are held for review.
- **Owner to-dos from Phase 9:**
  - **Sentry:**
    - create the project;
    - set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in Vercel (Production and Preview);
    - after the first Vercel build, check that a test error shows readable stack traces. If it doesn't, build with `next build --webpack` in CI (D-093).
  - **`NEXT_PUBLIC_CONTACT_EMAIL`:** a public address on the new domain, not your personal one. Until it's set, `/contact` points to the removal form.
  - **Review the legal drafts:** `/disclaimer`, `/privacy`, `/terms`, `/dmca` and `/credits`, plus `/community-guidelines` from Phase 6. Then remove each Draft badge with `draft={false}` on its `LegalPage`. Points to decide:
    - who runs the site (the data controller);
    - the governing law in the Terms;
    - whether the retention wording is what you want;
    - the "usually within 24 hours" promise on `/dmca`.
  - **Impressum** (only if you operate commercially from Germany): fill in the bracketed fields in `src/app/(site)/impressum/page.tsx`, then set `NEXT_PUBLIC_SHOW_IMPRESSUM=true`.
  - **Resend** (already listed): until it's set, removal requests reach only the Reports queue in production; the admin email is skipped with a log line.
  - **Check `ADMIN_EMAIL` in Vercel:** removal requests are emailed there.
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
  - ~~Add the cron schedules in Phase 11~~: done in `.github/workflows/cron.yml` (D-111); turn it on with the repository secrets (DEPLOY §6).
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
  - **Until there's a domain and Resend,** PROD email sign-in reaches only Supabase project team members (the built-in mailer). Members sign in with Google or Discord (D-114).
  - Scheduled publishing on Hobby runs every 30 min from GitHub Actions, which can start late, so a tip goes live up to about 30–40 min after its time (D-111).
  - The cron workflow has not run yet: it waits for the `PROD_SITE_URL` and `CRON_SECRET` repository secrets. In CI, `test:db` and the auth E2E tests skip (no DEV keys).
  - Vercel Preview deploys fail until the Preview env has the DEV Supabase keys (D-023: the Supabase URL and publishable key are always required). Production is configured and live.
  - The magic link from the default email template uses PKCE, so it must be opened in the browser that requested it (see the template to-do above).
  - Screenshots taken with the Playwright MCP during page load log a harmless hydration warning (Playwright injects `caret-color`).
  - `pnpm ingest:wiki` only prints a Phase 7 placeholder.
  - Sample clips use fake ids, so a loaded embed shows the platform's "unavailable" message.
  - TikTok is blocked in India: this machine resolves `www.tiktok.com` to an ISP "restricted" page. TikTok's live oEmbed and `embed.js` couldn't be checked here, and visitors in India won't see TikTok thumbnails or players (D-071).
  - The platform fixtures follow the documented responses, not recorded live ones (no keys yet). See the Phase 5 owner to-dos.
  - Clip pages, lists and weekly pages are cached (D-073), so rows changed directly in the database show up after the cache expires, as with articles and the forum.
  - ESLint 9 shows npm's deprecation warning. It stays until the plugins support ESLint 10 (D-034).
  - The Supabase MCP still needs the owner's sign-in; the Vercel MCP is signed in but needs team access approved (403 on projects). Context7 and Playwright work. Phases 2–3 used the Supabase CLI and the Management API instead.
  - Rows changed directly in the database skip the cache tags, so public pages show them within 10 minutes (D-051). `pnpm test:cleanup` deletes test articles the same way.
  - `pnpm seed:dev` prints Node's "module type" warning (the repo has no `"type": "module"`). It is harmless.
  - `next dev` regenerates a managed `AGENTS.md`; it is gitignored (D-060).
  - **No `ANTHROPIC_API_KEY` yet:** the AI pre-check runs on the §8.2 fallback. Members under 20 reputation are held for review and can't save a bio. See the Phase 6 owner to-dos.
  - The AI pre-check runs in Server Actions only. A member writing through the PostgREST API with their own JWT skips it; the database limits still apply (D-088, post-launch fix).
  - A held Q&A thread that a mod approves gets no AI suggested answer yet. Phase 8 should call `onThreadCreated()` on approval (D-080).
  - Onboarding's display name isn't pre-checked; edits in Settings are (D-080).
  - Static pages (`/about`, `/terms`, …) now revalidate every 5 minutes instead of never, because the maintenance banner reads the cached flags. Saving the flags refreshes them at once (D-086).
  - DEV's `site_settings.flags` row has no `SHADOW_HOLD_NEW_USERS` key (the seed doesn't overwrite rows). It reads as off, and the first save on `/admin/settings` writes it.
  - Full E2E runs use about 28 of DEV's 30 magic-link verifications per 5 minutes: space runs 5+ minutes apart, and prefer `--workers=4` (D-089).
  - Forum lists and thread pages serve stale data for one request after their 30 s cache expires (stale-while-revalidate, D-064). Rows changed directly in the database show up on the next load.
  - **JS budget:** first-load JS is 216–236 KB gzipped, against SPEC's 150 KB for article pages.
    - Next's router and React DOM are about 130 KB of that.
    - The rest is mostly Radix in the shell (the More sheet, the theme menu, the tooltip provider), sonner, next/image and the Turbopack runtime.
    - Lighthouse still scores 100 (TBT under 35 ms on simulated mobile).
    - Post-launch: load the More sheet and the toaster on demand. `e2e-prod/budgets.spec.ts` fails if any page grows past 240 KB (D-099).
  - The TikTok CSP hosts (`*.tiktokcdn.com`, `*.tiktokcdn-us.com`, `*.ttwstatic.com`) can't be checked from India (D-071, D-092). Check `embed.js` from another region after launch.
  - Sentry source maps are checked up to the upload; the upload itself needs the owner's token (D-093).
  - The film grain on hero areas now shows from the `lg` breakpoint only (D-099).
  - The service worker precaches only CSS, Latin fonts, icons and `/offline`; JS chunks are cached as pages are visited. A guide opened offline before its chunks were cached still reads, but without interactive bits (D-095).
  - On this Windows machine, Lighthouse can't start Chromium itself (`spawn UNKNOWN`). Start Chromium with `--remote-debugging-port=9222` (for example through Playwright), then run `LHCI_CHROME_PORT=9222 pnpm lhci`. Linux CI doesn't need this.
  - **Rate-limit fallback is per instance (D-105):** while Upstash is slow or down, each serverless instance counts on its own, so a burst spread across many instances can exceed a limit. Turnstile tokens are single-use and the database caps new accounts, so public writes stay bounded.
  - IP-keyed limits trust `x-forwarded-for`, which Vercel sets. Hosting off Vercel needs a trusted proxy in front (D-105).
  - `/api/og` draws any `?title=` (capped in length) and isn't rate-limited. On Vercel the CDN caches the images; consider a limit or an allowlist if it's abused.
  - Rows stored before D-101 keep any invisible characters. DEV has none, and PROD starts empty.
  - Vote rows can't change target any more (D-100). If a future feature needs to move votes (merging threads, say), it has to run with the service role.

## Owner setup (docs/SETUP.md) → needed by
- [x] Node 24.18 LTS, pnpm 12.21 (corepack, D-003), Git 2.55, Playwright Chromium; `CRON_SECRET` + `ANON_HASH_SALT` in `.env.local`
- [x] `.mcp.json` has the DEV ref. [ ] Sign in to Supabase + Vercel MCP (`/mcp`)
- [x] Supabase DEV keys + access token (with database write). [ ] DEV auth URLs, Google + Discord OAuth. [ ] PROD project → **Phase 11**
- [x] Upstash Redis. [x] Turnstile keys. [ ] Resend key + verified domain + Supabase SMTP → before launch (newsletter is DEV-only until then)
- [ ] Twitch app + YouTube key (code is ready; empty keys degrade safely, see Phase 5 to-dos). Anthropic key + spend limit → **before launch** (Phase 6 code is ready; see its owner to-dos). Voyage key + limit → **Phase 7**
- [ ] Domain (no "GTA", "Rockstar" or "Vice City") → after launch on vercel.app (D-114, DEPLOY §9). Sentry DSN + token → **Phase 11** (code ready since Phase 9). Vercel → **Phase 11**
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
- [x] Metadata audit, canonicals, noindex, sitemaps, rss, robots, JSON-LD tests, `/api/og` (D-096)
- [x] PWA via `@serwist/turbopack` (D-009, D-095); Vercel Analytics events (D-094); Sentry client/server/edge, with Turbopack source maps checked up to the upload (D-093)
- [x] Security headers + CSP (D-014, D-092); legal pages (D-097); /dmca form → reports + email (D-098)
- [x] Lighthouse mobile 100 in every category on the four pages; axe with 0 serious issues (D-099)
- [ ] JS budget: 216–236 KB first load vs SPEC's 150 KB (known issue)

### 10 · QA hardening · §15 · Prompt 10
- [x] All E2E (mobile + desktop); RLS attacks; auth/zod/rate-limit/Turnstile audit; XSS payload list; open redirects; cron secret (D-100 to D-105)
- [x] Abuse cases (Ask AI injection waits for Phase 8); empty states; visual QA at 390/1440 in dark and light; `docs/RUNBOOK.md`; go/no-go list

### 11 · Production deploy · §12 · Prompt 11
- [x] `docs/DEPLOY.md`; `pnpm db:push:prod` (migrations + seed only, the CLI stays on DEV, D-112)
- [x] GitHub Actions cron fallback for Hobby (D-111); IndexNow key location allowed in robots (D-113); `pnpm e2e:live`
- [x] Push; PROD schema + auth URLs; Vercel project + env (Preview → DEV), `NEXT_PUBLIC_SITE_HOSTS` = the vercel.app host (D-114)
- [x] Prod smoke test (12/14; the forum round-trip waits for `.env.prod.local`)
- [ ] Sentry test error (needs a DSN), Search Console + Bing, cron repository secrets (owner)

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
- ~~**Q3.**~~ Hobby for now; crons via GitHub Actions every 30 min (D-111). Pro before ads or affiliate links (DEPLOY §10).
- **Q4.** Domain name: launching on `<project>.vercel.app` first (D-114). Public email sign-in needs a domain + Resend (DEPLOY §9).
- **Q5.** After reading Fandom's ToS: a scheduled wiki sync, or manual runs only?
