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
