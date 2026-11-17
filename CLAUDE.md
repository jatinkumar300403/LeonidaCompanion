# CLAUDE.md — Leonida Atlas (unofficial GTA VI guide + community)

> Working name: **Leonida Atlas**. The name lives in one place (`src/config/site.ts`, overridable via `NEXT_PUBLIC_SITE_NAME`). Never hard-code it elsewhere.

## What this is
A fast, mobile-first, unofficial GTA VI companion site: **Tips & Tricks, Features Explained, Facts, Help Forum, Clips (embedded only), Ask AI (wiki-grounded answers with citations), Launch Hub, Online (coming soon)**. A native app will follow later by reusing this backend, so keep business logic out of React components and in `src/server/*` and Supabase.

The full spec is in `docs/SPEC.md`. **Read the relevant SPEC section before starting any task.** Progress is tracked in `docs/PROGRESS.md`, so update it at the end of every task.

## Non-negotiable rules (legal + trust)
1. **Never download, re-host, re-encode or proxy video.** Clips are only shown through the platforms' official embeds (Twitch, YouTube, TikTok), behind a click-to-load facade.
2. **No Rockstar/Take-Two branding.** Don't use the GTA VI logo, official key art, the Pricedown font or Rockstar logos. "GTA 6" / "GTA VI" may appear in page text and titles (nominative use), never in the site name, logo or domain.
3. **Footer disclaimer on every page**: "Unofficial fan site. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related marks are trademarks of Take-Two Interactive."
4. **License-aware knowledge base.** Ingest only sources in `src/config/sources.ts` whose `commercialUse` is `true` (unless `SITE_COMMERCIAL=false`). Show the source's attribution and licence link wherever its text is used. Ingest text only, never images.
5. **Spoilers**: story spoilers are hidden by default (`spoiler_level`), and the `||spoiler||` syntax works everywhere. Isolated cutscene or ending clips get rejected.
6. **No cheating, exploit, money-glitch, mod or leak content** for online modes. Moderation must block it.
7. **Facts carry a status badge**: `confirmed` (official source link required), `verified` (staff-checked, 2+ sources), or `community` (forum-sourced). Rumours are never published as facts.
8. AI answers must cite sources and say "Not confirmed yet" when the sources don't cover a question. Never invent mission names, locations or numbers.

## Stack
Next.js (latest stable, App Router, RSC, Server Actions), TypeScript strict, Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Supabase (Postgres, Auth, Storage, pgvector, RLS), Anthropic API (`@anthropic-ai/sdk`), Voyage AI embeddings, Upstash Redis (rate limits and cache), Cloudflare Turnstile, Resend + React Email, Serwist (PWA), Sentry, Vercel Analytics, Vitest, Playwright. Package manager: **pnpm**.

Before using any library API you're not 100% sure about, **look it up with the Context7 MCP**. Versions move fast, so never guess an API.

## Commands
```
pnpm dev            # local dev on :3000
pnpm build          # production build (must pass before every commit)
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm e2e            # playwright
pnpm db:push        # supabase db push (linked DEV project)
pnpm db:types       # regenerate src/types/database.ts
pnpm ingest:wiki    # run wiki sync locally (scripts/ingest-wiki.ts)
```

## Code conventions
- `src/app/*` = routes only (thin). Data access lives in `src/server/<domain>/*.ts`, validation in `src/lib/validation/*.ts` (zod), UI in `src/components/<domain>/*`.
- Mutations go through **Server Actions** or route handlers with zod validation, a rate limit (Upstash) and an auth check. Turnstile goes on public-facing writes (signup, thread, post, clip submit, ask when anonymous).
- **RLS on every table.** The service-role key is used only in `src/server/admin/*`, cron routes and scripts, and never imported into client components (enforce with `import "server-only"`).
- Markdown goes through remark/rehype with `rehype-sanitize`. No raw HTML from users, ever.
- Env vars are validated at boot in `src/env.ts` (zod). Every new var is added to `.env.example`.
- Accessibility: WCAG 2.2 AA, visible focus states, `prefers-reduced-motion` respected.
- Every new route needs `generateMetadata`, plus JSON-LD where SPEC says so.
- Tests: unit tests for every pure function in `src/lib` and `src/server`, and a Playwright test for every user flow listed in SPEC §15.

## Workflow
1. Read the SPEC section, then plan (use plan mode for anything over ~5 files).
2. Implement in small steps. After each step: `pnpm typecheck && pnpm lint && pnpm test`.
3. Before finishing a phase: `pnpm build` and the relevant Playwright tests. Check the UI at 390px and 1440px widths using the Playwright MCP and fix what looks off.
4. Update `docs/PROGRESS.md` (done / next / known issues) and commit with a conventional commit message.
5. If a decision isn't covered by SPEC, choose the simpler option, note it in `docs/DECISIONS.md`, and continue.

## Don'ts
- Don't add dependencies outside the stack without noting why in `docs/DECISIONS.md`.
- Don't write content (tips, facts) yourself unless asked. When asked, mark it `status='draft'` with sources.
- Don't touch the PROD Supabase project. The MCP and CLI are linked to DEV only.
- Don't disable RLS, type-checking or tests to "get it working".
