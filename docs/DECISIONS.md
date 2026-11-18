# DECISIONS — Leonida Atlas

Choices that SPEC doesn't fully pin down (CLAUDE.md workflow rule 5: pick the simpler option, write it here, continue).
Entries marked **Proposed** may be overridden by the owner. All others are in effect.

## Library versions (checked 2026-11-17)

Versions come from the npm registry (`npm view`). Setup notes come from the official docs: the Next.js 16 upgrade guide, the Supabase SSR guide, serwist.pages.dev, docs.sentry.io and resend.com.
Context7 wasn't connected in this session (D-001), so look an API up in Context7 the first time a phase uses it.

| Package | Version | Setup API, one line |
|---|---|---|
| next / create-next-app | 16.4.6 | `src/proxy.ts` exporting `proxy()` replaces middleware (Node runtime only, no edge); params/cookies/headers are async-only; Turbopack is the default for dev and build (`--webpack` opts out); `revalidateTag(tag, profile)` needs the 2nd arg, and `updateTag(tag)` gives Server Actions read-your-writes; `next lint` is removed; Node ≥ 20.9 |
| react / react-dom | 19.3.1 | Server Components by default; use `after()` from `next/server` for post-response work |
| typescript | **6.0.3** (7.0.2 is `latest`) | strict mode. Pinned below 6.1 because typescript-eslint 8.73 supports `>=4.8.4 <6.1.0` (D-004) |
| tailwindcss / @tailwindcss/postcss | 4.3.5 | CSS-first config: `@import "tailwindcss"`, tokens in `@theme`, class dark mode via `@custom-variant dark (&:where(.dark, .dark *))` |
| shadcn (CLI) | 4.23.0 | `pnpm dlx shadcn@latest init` (`create` is an alias). Choose Radix primitives if asked. Writes `components.json`, the globals.css variables and the `cn()` util |
| next-themes | 0.4.6 | `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` plus `suppressHydrationWarning` on `<html>` (no flash) (D-006) |
| @supabase/ssr | 0.12.7 | `createServerClient(url, publishableKey, { cookies: { getAll, setAll(cookies, headers) } })`; `proxy.ts` refreshes the session with `auth.getClaims()`; protect pages with `getClaims()`, never `getSession()` |
| @supabase/supabase-js | 2.119.0 | env `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SECRET_KEY` is server-only (`import "server-only"`) |
| supabase (CLI, devDependency) | 3.2.0 | `pnpm supabase link / db push / gen types`. Its binary download needs pnpm build approval (D-003, D-008) |
| @anthropic-ai/sdk | 1.9.0 | `new Anthropic()` reads `ANTHROPIC_API_KEY`. Streaming: `client.messages.stream({...})`, then `await stream.finalMessage()`. JSON: `client.messages.parse({ ..., output_config: { format: zodOutputFormat(Schema) } })` (from `@anthropic-ai/sdk/helpers/zod`), which returns `parsed_output` (null on failure). Check `stop_reason` before reading content (D-011) |
| Claude models | `claude-haiku-5-5` / `claude-sonnet-5-5` | Haiku 5.5 is the fast default: $0.10 in / $0.50 out per MTok, adaptive thinking on by default, effort defaults to `medium`. Sonnet 5.5 is used only for evals. Never send `temperature`/`top_p`/`top_k` or an assistant prefill (400) |
| @serwist/turbopack + serwist | 9.5.15 | `withSerwist` in next.config, `app/serwist/[path]/route.ts` with `createSerwistRoute`, `app/sw.ts`, `<SerwistProvider swUrl="/serwist/sw.js">`; esbuild peer. `@serwist/next` is webpack-only (D-009) |
| @upstash/ratelimit / @upstash/redis | 2.2.1 / 1.41.0 | `new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(n, "1 d"), prefix })`, then `await rl.limit(key)` |
| resend | 6.38.1 | `const { data, error } = await resend.emails.send({ from, to, subject, react })` |
| react-email / @react-email/render | 6.11.14 / 2.3.1 | `@react-email/components` is **deprecated on npm**. Before writing templates (Phase 3/12), confirm the current component import; plain JSX also works |
| @sentry/nextjs | 11.13.0 | Install with `npx @sentry/wizard@latest -i nextjs`. Files: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` (`onRequestError`), `app/global-error.tsx`. Config: `withSentryConfig({ org, project, authToken, silent, widenClientFileUpload })`. Turbopack source maps aren't confirmed in the docs, so check in Phase 9 |
| vitest | 5.1.0 | `defineConfig` from `vitest/config`; Node ^22.12 or ^24; `@vitejs/plugin-react` 6.3.0 for component tests |
| @playwright/test | 1.65.1 | projects: mobile 390×844 and desktop 1440×900; `webServer` runs `pnpm dev`. Chromium build 1255 is already installed on this machine |
| @playwright/mcp | 0.0.85 | loaded from `.mcp.json` (`npx @playwright/mcp@latest`) |
| wtf_wikipedia | 10.4.2 | `wtf(wikitext)`, then `.sections()` / `.text()` / `.infoboxes()`; read each section's `.title()` to detect spoilers |
| zod | 4.6.7 | env and input validation; the Anthropic SDK peer accepts zod 4 |
| eslint / eslint-config-next | 10.15.0 / 16.4.6 | flat `eslint.config.mjs`; `pnpm lint` runs `eslint .` |
| Others | — | prettier 3.10.1 · motion 14.14.0 · lucide-react 1.74.0 · react-markdown 10.1.0 · remark-gfm 4.0.1 · rehype-sanitize 6.0.0 · rehype-slug 6.0.0 · @vercel/analytics 2.0.1 · msw 3.0.6 · server-only 0.0.1 · @marsidev/react-turnstile 1.6.3 · pnpm 12.21.0 |

## Decisions

- **D-001 · 2026-11-17 · MCP servers.** The context7, playwright, supabase and vercel MCP servers weren't loaded in the Phase 0 session, because it started before `.mcp.json` was in the folder. Versions above therefore come from npm and the official docs. Phase 1 and later sessions should have them, after the owner approves them and signs in to Supabase and Vercel.
- **D-002 · 2026-11-17 · Repo hygiene.** `.gitignore` ignores `.env*` except `.env.example`, because Next's default `.env*` rule would hide the example file. `.gitattributes` forces LF: the kit files arrived with CRLF and Prettier expects LF. The kit files were copied verbatim, plus `docs/SETUP.md` for reference.
- **D-003 · 2026-11-17 · pnpm.** pnpm 12.21 runs through corepack shims in `%APPDATA%\npm`, because `corepack enable` can't write to `C:\Program Files\nodejs` without admin. Pin `"packageManager": "pnpm@12.21.0"` in Phase 1. pnpm doesn't run dependency build scripts until they're approved, so approve only what's needed (the supabase CLI binary, sharp, esbuild, @sentry/cli).
- **D-004 · 2026-11-17 · TypeScript 6.0.x.** Pin 6.0.x in strict mode. TS 7.0 is npm `latest`, but typescript-eslint, which eslint-config-next uses, supports `<6.1.0`. Revisit when typescript-eslint supports 7.
- **D-005 · Proposed · Next 16 conventions and caching.** Supabase session refresh goes in `src/proxy.ts`. Leave `cacheComponents` off for v1. Use `export const revalidate` (ISR) per SPEC §1, and `unstable_cache(..., { tags })` for Supabase reads. Invalidate with `updateTag` in admin Server Actions (the owner sees the change at once) and `revalidateTag(tag, "max")` in crons and route handlers. Confirm both APIs with Context7 in Phase 3.
- **D-006 · 2026-11-17 · next-themes.** This dependency is outside the listed stack. It's the approach shadcn documents, and it gives a system-following theme with no flash. Add it in Phase 1.
- **D-007 · Proposed · Contrast fixes.** Keep the SPEC accent hexes for fills, borders and gradients. Add per-theme `--<accent>-text` tokens wherever an accent fails AA as text. Light theme ratios: orange 1.8–2.0, teal 1.7–1.9, pink 3.0–3.3, violet 3.8–4.2:1. Dark theme: violet on surface / surface-2 is 4.3 / 4.0:1. Buttons on the dusk gradient get `#0A0B10` labels (5.9–9.6:1), because white labels only reach 2.0–3.3:1. The Phase 1 contrast test enforces all of this.
- **D-008 · 2026-11-17 · Supabase CLI.** Use the `supabase` npm package as a devDependency. `pnpm db:push` runs `supabase db push`, and `pnpm db:types` runs `supabase gen types typescript --linked > src/types/database.ts`. The MCP stays read-only; schema changes only go through migrations.
- **D-009 · 2026-11-17 · PWA.** Use `@serwist/turbopack`, because Next 16 builds with Turbopack and `@serwist/next` needs webpack. In Phase 9, check that the service worker at `/serwist/sw.js` controls `/` (scope header) and that the offline page works. Fallback: `next build --webpack` with `@serwist/next`.
- **D-010 · Proposed · Voyage over plain `fetch`.** Call `POST https://api.voyageai.com/v1/embeddings` with `model`, `input`, `input_type` and `output_dimension: 1024` instead of using the `voyageai` SDK. It's one endpoint, needs no dependency, and is easy to mock with MSW.
- **D-011 · 2026-11-17 · Claude API usage.** Use `@anthropic-ai/sdk` only.
  - Haiku 5.5 thinks by default, and thinking counts toward `max_tokens`. For Ask AI (SPEC cap: 700 tokens) and for moderation, send `thinking: { type: "disabled" }` (allowed at effort ≤ high) plus `output_config.effort: "low"`, then re-check quality with the Phase 8 eval.
  - Moderation uses `messages.parse` with a zod schema and a 4 s abort. A timeout, a parse failure or `stop_reason: "refusal"` falls back to SPEC §8.2's rule.
  - Haiku has no server-side refusal fallback. An Ask AI refusal shows the "Not confirmed yet" response.
  - If Sonnet 5.5 is used (evals), send `fallbacks: "default"` with the beta `server-side-fallback-2026-07-01`.
- **D-012 · 2026-11-17 · Cron routes.** Every `/api/cron/*` route accepts both GET (Vercel Cron only sends GET) and POST (manual runs, GitHub Actions). Both require `Authorization: Bearer ${CRON_SECRET}`. This overrides SPEC §7's POST-only wording.
- **D-013 · Proposed · Wiki sync time-box.** 500 pages at 1 request/second doesn't fit in one function run. The cron route stops after about 240 s and resumes from a cursor on the next run. Full syncs run with `pnpm ingest:wiki`, locally or in GitHub Actions.
- **D-014 · Proposed · CSP without nonces.** Nonces force every page to render dynamically, which breaks SPEC's ISR and Lighthouse targets. So: `script-src 'self' 'unsafe-inline'` plus the allowlisted hosts, with strict `frame-src`, `img-src`, `connect-src`, `object-src 'none'`, `base-uri`, `form-action` and `frame-ancestors`. User HTML is never rendered (rehype-sanitize), which is the main XSS control.
- **D-015 · 2026-11-17 · Clip category.** The stored value is `glitch`, labelled "Glitch (funny)". §6's `glitch-funny` is the label; the value comes from §1 and §11.
- **D-016 · 2026-11-17 · AI `hold`.** Threads and posts get status `held`. Clips stay `pending`, with the AI labels logged in `moderation_actions`. A held bio isn't saved: the user is told it needs review, and `self_harm` also notifies admins.
- **D-017 · 2026-11-17 · Replies and indexing.** AI suggestion posts don't count toward `reply_count`. "Unanswered" means `reply_count = 0`, or a Q&A category thread with no accepted answer after 24 h. A thread gets thin-thread noindex while `reply_count = 0 AND char_length(body) < 200`, at any age.
- **D-018 · 2026-11-17 · Feature flags.** Flags live in `site_settings` under the key `flags`, seeded off in Phase 2 and read through a cached `getFlags()` from Phase 3 on. Phase 6 adds the admin screen. The Online forum category is locked when `is_locked` is true or `FEATURE_ONLINE` is off.
- **D-019 · 2026-11-17 · Routes outside SPEC §1.** `/online/[slug]` exists only when `FEATURE_ONLINE` is on (404 otherwise). `guide` articles get no public route in v1. `/search` ships in Phase 1 as a stub that points to Ask AI; real search arrives in Phase 12.
- **D-020 · Proposed · LAUNCH_AT.** Until the owner confirms the unlock time, assume 2026-11-19 00:00 in the viewer's local time (regional midnight). An official instant in `site_settings.launch_facts.release_at` overrides it.
- **D-021 · 2026-11-17 · Embedding jobs.** There's no queue service, so publishing an article or accepting an answer embeds the content inside `after()`. Failures go to Sentry. Phase 7 adds a "Re-embed own content" button to `/admin/wiki`.
- **D-022 · 2026-11-17 · Clip ranking.** Clip "Hot" uses the thread hot-rank formula. Clip of the day is the highest-scoring approved clip from the last 24 h (ties broken by `views_on_platform`), or else the latest approved clip.
- **D-023 · 2026-11-17 · Env strictness (`src/env.ts`).** The Supabase URL and publishable key are always required. In production, the secret key, Upstash, Turnstile, `CRON_SECRET` and `ANON_HASH_SALT` are also required. Every other integration is optional: when it's missing, its feature is hidden and one console warning is logged.
- **D-024 · 2026-11-17 · +15 reputation for user tips.** v1 has no tip-submission flow. The trigger fires when an article written by a role-`user` author is published, so it stays inert until such a flow exists.
- **D-025 · 2026-11-17 · Scaffolding.** create-next-app refuses a folder that already holds CLAUDE.md, `.mcp.json` and similar files. Phase 1 scaffolds in a temp folder and moves the files in, keeping this repo's `.gitignore` and `.gitattributes` and merging in any new ignore entries.
- **D-026 · 2026-11-17 · Bundle budgets.** Next 16's `next build` no longer prints route sizes. In Phase 9, pick a Turbopack-compatible bundle analyzer (check with Context7) to enforce the 150 KB article-page JS budget.

### Phase 1 (2026-11-17)

- **D-027 · 2026-11-17 · Env strictness (amends D-023).**
  - `src/lib/env/schema.ts` validates every `.env.example` variable with zod when the server boots (`src/instrumentation.ts` → `src/env.ts`).
  - Empty values (`KEY=`) count as unset. A malformed value always fails, and the error names the variable, never its value.
  - The production-required set is enforced only when `VERCEL_ENV=production`. That set is D-023's list plus the Supabase URL and publishable key, plus an https `NEXT_PUBLIC_SITE_URL`.
  - Local, CI and Preview builds run with no keys. Each missing integration hides its feature and logs one warning at server start. Nothing is logged during `next build`, where every worker would repeat it.
  - **Consequence:** Vercel *Production* deploys fail until those keys exist. Preview deploys work.
  - Client code reads `NEXT_PUBLIC_*` through the zod-free `src/env.client.ts`, so zod never ships to the browser.
- **D-028 · 2026-11-17 · Theme tokens (implements D-006 and D-007).**
  - Dark tokens sit on `:root, .dark`, so dark is the default without JS; `.light` overrides them. next-themes uses `defaultTheme="system"`.
  - Text tokens, dark theme: `--pink-text #ff5c9d` and `--violet-text #a78bfa`. Orange and teal text use the SPEC accent.
  - Text tokens, light theme: `--pink-text #b0124f`, `--orange-text #a84b00`, `--teal-text #0e6f68`, `--violet-text #6d28d9`, `--destructive #b71c1c`.
  - Field borders use `--input` (#6b7287 / #7c8190). The focus ring is a solid 2 px outline (#ff3d8b / #b0124f). Both reach 3:1 or more on every surface.
  - Tinted badges use a 12% fill. Labels on the dusk gradient and accent fills use `#0a0b10`.
  - `src/lib/design/contrast.test.ts` parses `globals.css` and checks 209 pairs across both themes.
- **D-029 · Proposed · No `motion` dependency.**
  - SPEC §2 names the motion library. But its `layoutId` needs the `domMax` bundle (+28 KB), and animated cards would all become Client Components.
  - Instead:
    - card hover lift is the CSS `hover-lift` utility;
    - the tab underline slides via a measured indicator and a CSS transition;
    - toasts use sonner (shadcn's toast).
  - All of it turns off under `prefers-reduced-motion`. Revisit if the owner wants richer motion.
- **D-030 · 2026-11-17 · Sample data.**
  - Placeholder content lives in `src/server/mock/data.ts`. Every title starts with "[SAMPLE]", which a unit test enforces, and none of it is a claim about the game.
  - It is served only when `NODE_ENV=development`. Production and preview builds show the real empty states.
  - Pages get data only through `src/server/*` getters, which later phases fill in: `getHomeData`, `getFlags` (D-018 defaults), `isNewsletterEnabled` and `getLaunchHint`.
- **D-031 · 2026-11-17 · Navigation.**
  - Below `lg` (1024 px) the header shrinks to logo + search, plus sign-in once available.
  - A bottom bar then shows Home · Tips · Ask · Forum · Clips · More. The More sheet holds Features, Facts, Launch, Online, Settings and the theme switcher.
  - Sign in stays hidden until Supabase is configured. A `/sign-in` stub in `(auth)` keeps links working.
  - Nav hrefs are typed `Route`s (`typedRoutes: true`; `pnpm typecheck` runs `next typegen` first), and an E2E test requests every nav and footer link.
  - `src/components/home/` is an extra folder beyond SPEC §16.
- **D-032 · 2026-11-17 · Admin gate.** Until Phase 2 adds `requireRole('mod')`, `src/app/admin/layout.tsx` calls `notFound()` outside `next dev`. So `/admin/*`, including `/admin/ui`, returns 404 in every build.
- **D-033 · 2026-11-17 · Dependencies added in Phase 1** (CLAUDE.md "Don'ts").
  - **shadcn 4.23 with `--base radix`:** Base UI is now its default. It brings `radix-ui`, `class-variance-authority`, `lucide-react`, `tw-animate-css` and the `shadcn` CSS package. It also brings `cn`, shadcn's own replacement for clsx + tailwind-merge, published from shadcn-ui/cn. `sonner` comes with its toast.
  - **Also added:**
    - next-themes (D-006);
    - zod;
    - the markdown pipeline: react-markdown, remark-gfm, rehype-sanitize, rehype-slug, unist-util-visit;
    - server-only;
    - `@types/mdast` and `@types/hast`;
    - Prettier with prettier-plugin-tailwindcss, and eslint-config-prettier.
  - **Not needed:** `@vitejs/plugin-react` (Vitest 5 compiles TSX itself) and a direct sharp dependency.
- **D-034 · 2026-11-17 · Tooling.**
  - create-next-app 16.4.6 ran with these flags:
    - `--no-cache-components` (D-005);
    - `--no-agents-md` (CLAUDE.md is the agent guide);
    - `--no-agent-feedback`;
    - `--no-react-compiler`.
  - Its template now uses `@tailwindcss/turbopack`, so there is no PostCSS config.
  - ESLint stays on 9.x. eslint-config-next's react, jsx-a11y and import plugins only declare ESLint ≤ 9 peers, even though npm marks 9.x deprecated.
  - TS 6 defaults `types` to `[]`, so tsconfig sets `"types": ["node"]`.
  - pnpm 12 records build approvals as `allowBuilds` in `pnpm-workspace.yaml` (records D-003). `sharp` and `unrs-resolver` are set to `false`, since their prebuilt binaries work without the scripts. Nothing else asked.
  - `@playwright/test` is pinned to 1.65.1 to match the installed Chromium.
  - Prettier uses printWidth 120 and leaves the kit's Markdown and `.mcp.json` alone.
- **D-035 · 2026-11-17 · Markdown pipeline.**
  - Order: remark-gfm → remark-callouts → remark-spoiler → remark-citations (AI answers only) → rehype-sanitize → rehype-slug.
    - remark-callouts handles the five GitHub alert types.
    - remark-spoiler handles `||…||`. A paragraph that is only a spoiler becomes a block spoiler.
    - rehype-sanitize uses the GitHub schema plus only our own classes and data attributes.
  - Sanitizing runs before slugging, so heading ids stay readable and user text can't set an id. Raw HTML is never parsed.
  - A markdown `#` heading renders as `<h2>`, so the page keeps its single h1.
  - The `::youtube[id]` directive (SPEC §4) is left for Phase 3.
- **D-036 · 2026-11-17 · Logo, icons, hero.**
  - The mark is original: a dusk sun over water with a palm cut out, and no lettering. It lives in `src/components/layout/logo.tsx` and `src/app/icon.svg`.
  - `pnpm gen:icons` renders `favicon.ico` (16/32/48) and `apple-icon.png` (180) through Playwright's Chromium.
  - The hero gradient sits on "unofficial guide", never on "GTA VI" (rule 2).
  - PWA and maskable icons come in Phase 9.
- **D-037 · 2026-11-17 · Countdown, spoilers, forms.**
  - **Countdown:** CountdownOrStatus ticks in the browser from LAUNCH_AT (local midnight, D-020). The server renders same-size placeholders until hydration. Once launch has passed in every time zone (after 19 Nov 12:00 UTC), the server renders the "Out now" pill directly via `getLaunchHint()`, with no layout shift.
  - **Inline spoilers** are a `span role="button"` that reacts to Enter, Space or click, so long spoilers wrap with the text. Block spoilers use a real button.
  - **Hidden spoiler text** is blurred, `aria-hidden` and `inert`. Revealing moves focus to the text.
  - **Newsletter and waitlist forms** render disabled with "Sign-ups open soon" until Phase 3 wires the double opt-in.

### Phase 2 (2026-11-17)

- **D-038 · 2026-11-17 · Profile completion and onboarding.**
  - A `profiles` row exists only once onboarding is done (username, 16+, Terms + Guidelines). `handle_new_user()` creates it at sign-up only when the metadata already carries all three (for the future native app). It never raises, so a bad value can't block sign-up.
  - `src/proxy.ts` refreshes the session with `getClaims()` and sends signed-in users without a profile to `/onboarding?next=…`. Auth, API, sign-in and the legal pages stay reachable.
  - An `onboarded_uid` cookie hint means one profile lookup per session. It is a UX shortcut only: RLS still needs a profile for every write.
  - Added `profiles.terms_accepted_at` (not null). Usernames can't be changed after onboarding (no column grant).
  - The header's account control (`UserMenu`) reads the session in the browser. Public pages stay static/ISR; only `/settings`, `/onboarding`, `/sign-in`, `/u/[username]` and `/admin` render per request.
- **D-039 · 2026-11-17 · Column grants instead of trusting the client.**
  - `anon`/`authenticated` can select only the public profile columns. `public_profiles` is a `security_invoker` view over them.
  - The owner reads their private columns (ban state, email prefs, age/terms timestamps) through `get_my_profile()`. It is security definer and returns only `auth.uid()`'s row. The Supabase advisor's WARN for it is accepted.
  - Insert/update column grants on profiles, threads, posts, clips, reports and notifications mean users can't set role, reputation, ban state, scores, counters or ids.
  - Guard triggers (security invoker) stop non-mods changing author, category or status. The exceptions are soft-delete and accept → solved. Non-mods also can't edit removed, held or locked items.
  - The 30-minute edit window is left to Phase 4's server code.
- **D-040 · 2026-11-17 · Supabase CLI, DEV only.** Every `db:*` script goes through `scripts/supabase.mjs`.
  - It loads `.env.local` and refuses to run unless the URL, `SUPABASE_PROJECT_REF_DEV` and `supabase/.temp/project-ref` all agree and differ from the PROD ref.
  - Commands target DEV explicitly (`--remote=@dev`).
  - CLI 3.1.0 mints a temporary login role from `SUPABASE_ACCESS_TOKEN`, so no database password is needed. The token needs the **database write** permission; the first token didn't have it.
  - Phase 11 needs an explicit PROD path, because this guard refuses PROD on purpose.
- **D-041 · 2026-11-17 · Seed admin.** `seed.sql` can't read environment variables. `pnpm db:seed` pushes the seed, then `scripts/seed-admin.mjs` calls `set_seed_admin(SEED_ADMIN_EMAIL)`. That function is service-role only and stores the address in `private.seed_admins`. The account is promoted at once if its profile exists, otherwise automatically when its profile is created. `seed.sql` also re-promotes on every run.
- **D-042 · 2026-11-17 · Schema details beyond SPEC §11.**
  - `tags` and `reserved_usernames` tables, seeded from `src/config/tags.ts` and `src/config/auth.ts`. A unit test keeps `seed.sql` in step with them.
  - Foreign keys to profiles from content (threads, posts, articles, clips, reports, ask_logs) are `on delete set null`, so a deleted account leaves "[deleted user]". Votes, blocks and notifications cascade.
  - Identity columns replace bigserial.
  - Reports also accept `profile`, `article` and `dmca` targets and a `copyright` reason (for Phase 9's /dmca).
  - Published facts need `fact_status`, and confirmed facts a source (CLAUDE.md rule 7), enforced by check constraints.
  - `match_chunks` and `search_chunks_fts` can be executed by the service role only. Phase 8 calls them from `src/server/admin`, so the knowledge base can't be scraped through the public API (advisor fix).
  - Admin write policies are split per action (one permissive SELECT policy per table).
  - The database locks a category through `is_locked` only. When Phase 6's flag screen turns `FEATURE_ONLINE` on, it must also unlock the Online category (D-018).
- **D-043 · 2026-11-17 · RLS tests run against DEV.**
  - `pnpm test:db` (Vitest, `supabase/tests/`) uses throwaway `rls-…@example.com` users: user, other, banned, mod, admin.
  - It checks every §11 rule, the triggers and storage, and asks the Management API that every public table has RLS on.
  - It refuses to run against anything but DEV and skips when the keys are missing (CI).
  - It is kept out of `pnpm test`, which stays offline.
  - `pnpm test:cleanup` sweeps leftover test users and rows.
  - Chose this over pgTAP because the Docker daemon isn't running on this machine.
- **D-044 · 2026-11-17 · Magic links in tests.**
  - Under `next dev`, sign-ins for `e2e-…@example.com` addresses skip email. `admin.generateLink` creates the link, which is kept in a server-side mailbox that `GET /api/test/mailbox` hands to Playwright.
  - In production builds `NODE_ENV` is `production`: the route 404s and the branch is dead code.
  - The auth E2E tests need the DEV keys and skip without them. Playwright's global teardown runs `pnpm test:cleanup`.
- **D-045 · 2026-11-17 · Avatars.**
  - The browser crops a square (drag, zoom slider, arrow keys) to 512 px and encodes WebP, with a JPEG fallback.
  - The Server Action re-encodes it with **sharp**. That strips EXIF, checks it really is an image and caps it at 512 px WebP ≤ 2 MB. The action uploads as the user to `avatars/<uid>/` (storage RLS) and deletes the old file.
  - The avatars bucket accepts WebP only, up to 2 MB.
  - Source photos up to 15 MB are accepted in the browser: SPEC's 2 MB limit applies to the stored avatar.
- **D-046 · 2026-11-17 · Turnstile and rate limits.**
  - **Turnstile** guards the magic-link form and onboarding. With no keys (local DEV now), the widget is hidden and the server check is skipped. Production can't boot without the keys (D-023).
  - **Upstash limits:**
    - magic link: 5 per 15 min per IP and 3 per 15 min per email;
    - username check: 60 a minute;
    - onboarding: 10 an hour;
    - profile saves: 30 an hour;
    - avatar: 10 an hour;
    - export: 5 a day;
    - delete: 3 an hour.
  - Keys are salted hashes (`ANON_HASH_SALT`), never raw IPs or emails.
  - A Redis error lets the request through and is logged, so an outage can't lock everyone out on launch day.
  - Dev test identities skip both.
- **D-047 · 2026-11-17 · Auth flow details.**
  - Magic links use `signInWithOtp`. Their `emailRedirectTo` is `<trusted origin>/auth/callback?next=…`, where the origin is checked against `NEXT_PUBLIC_SITE_HOSTS`, localhost and the Vercel host, else the site URL.
  - `/auth/callback` accepts `code` (OAuth and the default PKCE email) and `token_hash` + `type`. `next` always goes through `safeNextPath()`, so there are no open redirects.
  - Google and Discord buttons show only when `/auth/v1/settings` reports them enabled (cached for an hour).
  - Sign-out runs in the browser, then reloads, so no component keeps a stale session.
  - Account deletion: the Server Action deletes the account; the browser signs out, leaves a flash cookie and reloads.
  - Forms submit through `onSubmit` + a transition (`submitWithoutReset`), because React 19's automatic form reset blanks controlled inputs after an error.
- **D-048 · 2026-11-17 · Dependencies added in Phase 2** (CLAUDE.md "Don'ts").
  - From the stack: `@supabase/supabase-js` 2.119, `@supabase/ssr` 0.12.7, `@upstash/ratelimit` 2.2.1, `@upstash/redis` 1.41, and the `supabase` CLI 3.1.0 as a devDependency (3.2.0 is out, but pnpm's release-age policy installed 3.1.0).
  - Outside it:
    - `@marsidev/react-turnstile` 1.6.3, the Turnstile widget;
    - `sharp` 0.35.5, a direct dependency for avatar re-encoding (it was already in the tree through Next).
  - shadcn checkbox, radio-group, switch, textarea, slider and alert-dialog, with their own focus rings removed so the global solid ring applies (D-028).
- **D-049 · 2026-11-17 · `NEXT_PUBLIC_SUPABASE_URL` must be the bare project URL.** The env schema rejects a path such as `/rest/v1/`, which breaks auth and storage. The DEV value had one; it was fixed in `.env.local`.

### Phase 3 (2026-11-18)

- **D-050 · 2026-11-18 · Rendering per route** (confirms D-005 with Context7: `unstable_cache` + tags still works in Next 16.4; `updateTag` in Server Actions; `revalidateTag(tag, "max")` elsewhere).
  - `/tips`, `/features`, `/facts` and `/online` render per request, because they read `searchParams` (tag, spoilers, sort, cursor). The data under them is tag-cached, so a request costs one cached read.
  - Article pages are ISR: `generateStaticParams()` returns `[]`, `revalidate = 600`. `/launch` and `/` are ISR at 60 s.
  - Index canonicals keep `?tag=` only; cursor pages are `noindex, follow`.
- **D-051 · 2026-11-18 · Public reads.** `src/server/supabase/public.ts` is a cookie-less publishable-key client, so cached reads run as `anon` and RLS decides what is public. No service role for public pages.
  - Tags: `articles`, `articles:<type>`, `article:<type>:<slug>`, `site-settings`, `launch-facts`. Admin actions call `updateTag` (read-your-writes); the cron calls `revalidateTag(…, "max")`.
  - **Caveat:** rows changed directly in the database (SQL editor, scripts) skip the tags and show up within 10 minutes (5 for settings). Publish through the CMS.
- **D-052 · 2026-11-18 · Scheduled publishing.** A scheduled article is `status = 'published'` with a future `published_at`; RLS already hides it. `/api/cron/publish-scheduled` (GET + POST, Bearer `CRON_SECRET`, D-012) runs the pipeline once `published_at` passes and sets the new `articles.pipeline_ran_at`. Publishing now sets it at once. The `vercel.json` cron entry waits for Phase 11 (Hobby vs Pro, Q3).
- **D-053 · 2026-11-18 · "Was this helpful?" votes.**
  - Signed-in votes go through RLS (`voter_key` = user id). Anonymous votes use an httpOnly `la_anon` cookie (random UUID); `voter_key` is `anon:` + its salted hash, written by the service role after checking the article is live.
  - 60 votes an hour per IP. Pressing the same button again takes the vote back. The browser remembers its vote in localStorage; counts on the cached page refresh with ISR.
  - The `updated_at` trigger now ignores counters, so votes don't change "Updated x ago".
- **D-054 · 2026-11-18 · Newsletter double opt-in** (SPEC §9; the digest list reuses it in Phase 12).
  - New columns: `pending_lists` (lists wait there until confirmed) and `confirm_sent_at`. `confirm_token` holds a SHA-256 hash of the emailed token, valid 7 days and single use.
  - The confirm page needs a button press (POST), so email link scanners can't confirm on their own.
  - The reply is always "check your inbox", so the form can't reveal who is subscribed. Limits: 5 an hour per IP, 3 a day per address.
  - Turnstile mounts on first focus, so the footer form doesn't load Cloudflare's script on every page.
  - **Without Resend:** in `next dev` the email goes to a dev outbox (logged, and served by `/api/test/mailbox?kind=newsletter` for `e2e-…` addresses). Production builds without Resend keep the forms disabled.
- **D-055 · 2026-11-18 · Email templates.** Plain HTML + text from a pure function (`src/emails/newsletter-confirm.ts`, escaped and unit-tested) sent with the `resend` SDK. React Email's component package is deprecated on npm, so it isn't added.
- **D-056 · 2026-11-18 · Slugs.** Generated from the title until the editor touches the field; unique per type with a `-2`, `-3` suffix. A slug locks once the article has been published or archived, so links never break. An article's type can't change after creation.
- **D-057 · 2026-11-18 · Autosave scope.** Drafts and articles in review autosave every 5 s while there are changes. A live article changes only on "Update live article"; meanwhile unsaved edits are backed up in localStorage and offered back on the next visit. An unsaved-changes guard covers reloads and in-app links. No edit-conflict detection (one owner).
- **D-058 · 2026-11-18 · Quick Tip limits and fact rules.** Title 5–160 characters, body 20–700. "2–5 sentences" is a live hint, not a rule. The summary is derived from the body; an optional source becomes `sources[0]`. Publishing a fact needs a status; confirmed needs a source; verified needs two (rule 7; the database enforces the first two).
- **D-059 · 2026-11-18 · Admin access.** The article list, editor and `/admin/launch` are admin-only, matching RLS (only admins write articles and settings). Moderators see the dashboard. Dashboard numbers come from the service role (counts only, never rows).
- **D-060 · 2026-11-18 · Phase 3 odds and ends.**
  - `::youtube[11-char id]` on its own line becomes the click-to-load ClipEmbed facade, articles only (finishes D-035).
  - TOC anchors use `github-slugger`, the slugger rehype-slug uses, so TOC links always match heading ids.
  - `/api/og` uses `next/og` with the default font: dusk gradient, section, title, site name.
  - Next 16's `next dev` writes a managed `AGENTS.md`; it is gitignored (CLAUDE.md is the agent guide, D-034).
  - Onboarding now skips rate limits and Turnstile for dev test identities, as D-046 intended; E2E #1 failed once real Turnstile keys were added.
  - **Dependencies added:** `resend` 6.38 (in the stack) and `github-slugger` 2.0 (already in the tree through rehype-slug).
  - **Deferred:** `view_count` (needs a non-cached write), embedding similarity in "Related" (Phase 7), unsubscribe links (Phase 12).

### Phase 4 (2026-11-18)

- **D-061 · 2026-11-18 · Edit window and deleting.**
  - Authors can edit a thread (title, body, tags, spoiler flag) or a reply for 30 minutes after posting. Every edit shows "edited". Mods can edit at any time.
  - SPEC §5's "later edits show edited" is read as "edits are marked", and "edit within 30 min" as the window. This settles D-039's open point.
  - The database guards enforce the window too (`edit_window_closed`), so the API can't get around it.
  - Deleting is allowed at any time:
    - A reply soft-deletes (`[deleted]`, it stops counting).
    - A thread with no replies is hard-deleted (the Phase 2 RLS rule).
    - A thread with replies keeps its title and replies, and its question becomes `[deleted]`.
- **D-062 · 2026-11-18 · New-account limits and links live in the database.**
  - The API is reachable directly with a user's JWT, so server-side checks alone can't hold. Before-insert triggers on threads and posts apply SPEC §5 to API users. Staff and the service role are exempt.
  - **Limits:**
    - "New" means an account younger than 24 h or with reputation under 5.
    - New accounts get 3 threads and 20 replies per rolling 24 h, counted in any status, so deleting doesn't reset them.
    - Links need reputation ≥ 20 and an account at least a day old, on insert and on edit.
  - "Link" means anything markdown renders as one: `http(s)://`, `www.`, `](`, `<scheme:` and reference definitions.
  - `containsLink()` in TS mirrors `private.contains_link()`, and a DB test compares the two on the same inputs. The TS copy only drives the composer hint and friendlier messages.
  - DB test users are "established" by default (2 days old, reputation 20). `{ fresh: true }` gives a new account.
- **D-063 · 2026-11-18 · Turnstile and rate limits on forum writes.**
  - **Turnstile** guards new threads and replies, the public writes CLAUDE.md lists. The widget mounts on first focus, and the reply box re-mounts it after each reply because a token works once.
  - Votes, edits, deletes, accept, reports, blocks and mark-read are signed-in actions with Upstash limits only. A challenge per click would break optimistic voting.
  - **Limits** are per user, per hour unless noted:
    - threads 10 (30 at rep ≥ 100);
    - replies 60 (200 at rep ≥ 100);
    - 120 thread-or-reply writes per IP;
    - edits 60, deletes 30, votes 300, accepts 30, reports 10, blocks 30;
    - similar-threads lookups 60 a minute per IP;
    - mark-read 120.
  - SPEC's "no rate-limit warning at rep ≥ 100" became that bigger tier.
  - Dev test identities skip both checks (D-046, D-060). The DB limits still apply to them.
- **D-064 · 2026-11-18 · Forum rendering, caching and lists.**
  - Forum pages render per request (they read the session).
  - Public data is read as `anon` and cached with `unstable_cache`:
    - categories with counts (`threads(count)`, RLS-filtered) and every list sit under the tag `forum`;
    - each thread sits under `thread:<id>`;
    - revalidate is 30 s (60 s for categories).
  - Server Actions call `updateTag` on both tags, so the writer sees the change at once. Votes update only the thread's tag.
  - Per-viewer data is read live on top: blocks, own votes, own held or removed replies. Staff, and the author of a held or removed thread, read the thread live under RLS.
  - **Lists:**
    - Sorts: Hot (`hot_threads`), New, Top (today / week / all, default week) and Unanswered.
    - Unanswered (D-017) means `status = 'open'` and either no replies, or a Q&A thread older than 24 h.
    - Offset pages via `?page=` (20 a page, max 50) are real links. Page 2+ is `noindex, follow`, and sorted views canonicalise to the category.
    - `/forum?sort=…` lists every category (the home page's "Unanswered" link). Plain `/forum` is the landing page.
  - Lists read a generated `threads.excerpt` (first 280 characters), so they never fetch full bodies.
  - A thread URL with an old or wrong slug redirects to the current one. The slug follows the title when it is edited.
- **D-065 · 2026-11-18 · Quote replies and notifications.**
  - A quote reply stores `posts.reply_to_post_id`, which must point at a post in the same thread.
  - Each new visible reply notifies each person at most once, in this order: the quoted author (`post_reply`, SPEC §9's "reply to my post"), the thread author (`thread_reply`), then mentions.
  - Mentions in a new thread's question notify too. Blocks are respected everywhere, and payloads now carry `thread_slug`.
  - The header bell reads the user's own notifications in the browser under RLS, so cached pages stay static. It refreshes on open and every 60 s while the tab is visible, and marks rows read through a rate-limited Server Action. The account slot widened to 5.25 rem so the header doesn't shift.
- **D-066 · 2026-11-18 · Spoilers, categories and answers.**
  - **Missions & Story** (`spoilers_allowed`): threads there are always `is_spoiler`, and the question and every reply render inside a spoiler block.
  - **`is_spoiler`** elsewhere hides the question behind a spoiler block and blurs the list excerpt. Spoiler threads get a generic meta description.
  - **Online** is read-only while `is_locked`, or while `FEATURE_ONLINE` is off (D-018). Mods can still post.
  - **Accept** is offered only in Q&A categories, to the asker or a mod, and can be undone. The accepted answer is pinned under the question and left out of the reply list.
  - `onThreadCreated()` (`src/server/forum/hooks.ts`) is the Phase 8 hook for AI suggested answers. `enqueueForumSolutionEmbedding()` and `removeForumSolutionEmbedding()` are Phase 7 stubs (D-021). Both run in `after()`.
- **D-067 · 2026-11-18 · Blocks, reports, SEO.**
  - Threads by people you blocked are left out of your lists. Their replies collapse to "You blocked @x. Show anyway".
  - Block and unblock live in each post's menu and on profiles. Reports cover threads, posts and profiles, with SPEC §5's reasons mapped to the table's values (e.g. "Spoiler without a tag" → `spoiler`). They only insert rows; the queue is Phase 6.
  - **JSON-LD:** QAPage for Q&A threads with an accepted answer, DiscussionForumPosting otherwise, plus BreadcrumbList. Deleted authors become "Deleted user".
  - **noindex:** thin threads (D-017), deleted questions, `/forum/new`, and held threads (only their author or staff can load them).
  - `@username` in forum markdown links to the profile through the `remark-mentions` plugin (MarkdownRenderer `mentions` prop; the sanitizer allows the `mention` class).
- **D-068 · 2026-11-18 · "Similar threads".** `public.similar_threads()` uses the trigram operators `%`, `<%` and `%>` on titles, with thresholds lowered on the function (0.2 / 0.4) so the existing GIN index still serves it. It runs as the caller, so held and removed threads never show. `/forum/new` asks `GET /api/forum/similar` 350 ms after typing stops (6+ characters).
- **D-069 · 2026-11-18 · Phase 4 dependencies.** None added. The bell, menus and dialogs reuse the shadcn components already installed.

### Phase 5 (2026-11-18)

- **D-070 · 2026-11-18 · Clip submissions go through the server.**
  - Phase 2 let any member insert a `clips` row through the API, with a title, creator and thumbnail of their choosing. Migration `20261118170000_clips_phase5.sql` drops that policy and revokes `insert` from `anon`/`authenticated`.
  - `submitClip` re-runs `resolveClip()` on the server, so every stored field comes from the platform. It then inserts with the service role from `src/server/admin/clips.ts`, with `submitted_by` set to the session user. The Twitch cron inserts the same way.
  - Votes on clips need `status = 'approved'` (`private.votes_validate`), so a mod can't vote on a pending clip either.
  - Fix: the approve/reject trigger wrote the payload key `title`, but the bell reads `clip_title`, so notifications said "Your clip". The trigger now writes `clip_title`.
  - `public.hot_clips(category, limit, offset)` runs as the caller (approved only) and orders by `hot_rank(score, approved_at)` (D-022).
- **D-071 · 2026-11-18 · Platform lookups (`src/server/clips`).**
  - URL parsing is pure (`src/lib/clips/parse.ts`) with exact hostname lists, so look-alike domains are refused. Twitch: `clips.twitch.tv/<slug>`, `clips.twitch.tv/embed?clip=`, `twitch.tv/<channel>/clip/<slug>`, `m.twitch.tv/clip/<slug>`. YouTube: watch, `youtu.be`, `shorts`, `embed`, `live`, nocookie. TikTok: `@user/video/<id>`, `m.tiktok.com/v/<id>.html`, embed and player links, and short links (`vm.`, `vt.`, `/t/`), which oEmbed resolves.
  - **Twitch:** the app token (client credentials) is cached in Upstash under `twitch:app-token` until 5 minutes before it expires, and fetched again once on a 401. GTA VI's game id is `TWITCH_GTA6_GAME_ID`, else `GET /helix/games?name=Grand Theft Auto VI`, cached 7 days (15 minutes when Twitch has no such category; Twitch clips are then refused with a clear message). The creator credit is the broadcaster, linked through one `/helix/users` lookup for the login.
  - **YouTube:** `videos.list?part=snippet,contentDetails,status,statistics`. Statistics adds the view count that breaks clip-of-the-day ties, at the same quota cost. Rejected: `embeddable = false`, private, live or upcoming, `P0D`, over 60 s.
  - **TikTok:** oEmbed gives no duration, so the queue shows "Length unknown: check it".
  - Every call has a 5 s timeout. Platform trouble becomes "<Platform> didn't answer"; nothing throws into the page.
  - **Without keys:** YouTube and Twitch links say they "can't be checked yet", and the submit page names the platforms that work (TikTok needs no key). Without the Supabase secret key, submissions show "not open yet". The crons answer `{ skipped }` and log one line.
  - **Orientation** is derived, not stored: TikTok and YouTube `/shorts/` links are portrait.
  - **Thumbnails** are stored only from an allowlist in `src/config/clips.ts`: `i.ytimg.com`, `clips-media-assets2.twitch.tv`, `static-cdn.jtvnw.net`, `*.tiktokcdn.com`, `*.tiktokcdn-us.com`. The same list feeds `images.remotePatterns`, so next/image never meets an unknown host. `ClipEmbed` falls back to the original placeholder art when a thumbnail fails (TikTok's are signed and expire).
  - **TikTok is blocked in India** at the DNS level: the build machine resolves `www.tiktok.com` to an ISP "restricted" page. Vercel's servers can still call oEmbed, but visitors in India won't see TikTok thumbnails or players, and their "Watch on TikTok" link fails the same way.
- **D-072 · 2026-11-18 · Clip limits, Turnstile, review.**
  - Upstash limits, per user unless noted: link lookups 30 per 10 min (60 per IP), submissions 10 an hour (30 per IP), votes 300 an hour, reviews 600 an hour. Reports reuse the forum's `reportContent` (`"clip"` added to `REPORT_TARGETS`).
  - Turnstile guards the submission (a public write). The preview lookup has rate limits only.
  - Duplicates (`platform` + `external_id`) get a friendly message: "already on the site" with a link, "waiting for a moderator", or "reviewed before". A race on the unique key is handled the same way.
  - `precheckClip()` (`src/server/clips/hooks.ts`) is the Phase 6 AI hook. It allows everything for now; every submission is pending anyway (D-016).
  - Mods review as themselves under RLS. Each approve, reject or remove writes a `moderation_actions` row through `logModerationAction()` (`src/server/moderation/log.ts`), which Phase 6 can reuse.
- **D-073 · 2026-11-18 · Clip rendering, caching and the E2E mock.**
  - `/clips` renders per request (it reads `searchParams`, like D-050) over reads cached 60 s under the tag `clips`. Hot uses `hot_clips`; New sorts by `approved_at`; Top this week is clips approved in the last 7 days, by score. 12 a page, `?page=` links, page 2+ `noindex`.
  - `/clips/[id]` is ISR (300 s, tag `clip:<id>`, `generateStaticParams` returns `[]`); anything not approved is a 404. `/clips/top/[week]` is ISR (1 h, tag `clips-weekly`).
  - The viewer's own votes are read in the browser under RLS (`ClipVoteScope`, one query per page), so no clip page reads the session. Votes update `clip:<id>`; reviews update `clips` and `clip:<id>`.
  - **E2E mock (follows D-044):** under `next dev`, lookups made for `e2e-…@example.com` users go to `src/server/clips/dev-mock.ts`, which answers from the recorded fixtures in `src/server/clips/__fixtures__`. No keys, no platform traffic, and it works with a reused dev server. In production builds `NODE_ENV` is `production`, so it never runs.
  - The fixtures follow the documented responses, because the keys weren't available and TikTok is blocked here. Re-record them from real responses once the keys exist (PROGRESS lists what to check).
- **D-074 · 2026-11-18 · Weekly top 10 and clip of the day.**
  - Weeks are ISO weeks in UTC, keyed `2026-w47` (`src/lib/clips/week.ts`).
  - `/api/cron/weekly-clips` freezes the previous week: clips approved during it, top 10 by score, ties broken by platform views, then by the earlier approval. A week that already has a snapshot is never rewritten. `?week=` backfills a finished week; an unfinished week is refused.
  - Clip of the day follows D-022: the best score approved in the last 24 h, else the latest approved clip. In dev, the home page falls back to the `[SAMPLE]` clip only when there is none (D-030).
  - Schedules for Phase 11's `vercel.json` or the GitHub Actions fallback: `twitch-clips` hourly, `weekly-clips` Monday 06:00 UTC.
- **D-075 · 2026-11-18 · CSP started, platform images allowed.**
  - There was no CSP yet. `next.config.ts` now sends `frame-src 'self'` plus `clips.twitch.tv`, `player.twitch.tv`, `www.youtube-nocookie.com`, `www.tiktok.com` and `challenges.cloudflare.com`, and also `object-src 'none'; base-uri 'self'`.
  - Phase 9 adds the rest of D-014: `script-src` (with `www.tiktok.com` for `embed.js`), `img-src`, `connect-src`, `frame-ancestors` and `form-action`.
  - Twitch `parent` hosts are `NEXT_PUBLIC_SITE_HOSTS` + `localhost` + the current host + `VERCEL_URL` (set by Vercel on every deploy and passed from the server).
- **D-076 · 2026-11-18 · Clip pages and the review queue.**
  - **Clip page:** facade, title, category, creator credit + "Watch on <Platform>", the caption through `MarkdownRenderer` (so `||spoilers||` work), votes, Report, "shared by @user", and VideoObject + BreadcrumbList JSON-LD. VideoObject has no `contentUrl`, because we never host the video. `uploadDate` is the approval time, and the OG image stands in when there's no thumbnail.
  - **Removal:** "I'm the creator: remove this" links to `/dmca?clip=<id>`. Phase 9's removal form must read `clip`; until then `/dmca` points to the contact page. Admins remove an approved clip in one click from `/admin/clips` → Approved → Remove (with a reason).
  - **`/admin/clips`** (all staff, in the admin nav): tabs Pending (oldest first), Approved, Rejected and Removed; a Members / Twitch auto filter; an inline facade preview; a category select applied on approve; reason presets plus free text for reject and remove; big tap targets at 390 px. Keys: **A** approves, **R** rejects or removes, **J/K** move. They're ignored while typing or in the consent notice. A reviewed clip leaves the list at once.
  - **Submit page:** a live preview 500 ms after the link looks right; six category buttons (`glitch` shown as "Glitch (funny)", D-015); a caption up to 140 characters (the database allows 280 for mod edits); and a required "This isn't a story spoiler or cutscene" box (CLAUDE.md rule 5). After sending, a "Sent for review" panel.
- **D-077 · 2026-11-18 · Phase 5 dependencies.** None added. The Upstash client moved to `src/server/cache/redis.ts` (`getRedis`, `sharedCache`), shared by the rate limits and the Twitch token cache.
