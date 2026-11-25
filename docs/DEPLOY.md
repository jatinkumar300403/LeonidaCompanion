# DEPLOY: Leonida Atlas to production

Written in Phase 11 (25 Nov 2026). It's the exact path for the setup the owner chose:
- **Vercel Hobby**;
- the site lives at **`https://<project>.vercel.app`** first, with a custom domain later (§9);
- a **private GitHub repo**;
- crons from **GitHub Actions every 30 minutes** (D-111).

Decisions: D-111 to D-114. Day-to-day operations: `docs/RUNBOOK.md`.

**Rules for the whole page:**
- Never paste a key into chat, an issue or a commit. Keys go into dashboards (Vercel, GitHub, Supabase) directly, or into git-ignored `.env*.local` files on this machine.
- **Production** env → the **PROD** Supabase project. **Preview** env → the **DEV** project.
- PROD Supabase gets **migrations + `seed.sql` only**, through `pnpm db:push:prod` (D-112). Never `pnpm seed:dev`, never sample content, never the DEV scripts.
- Claude asks in chat before each outward step: the push, the PROD database push, and Vercel project or env changes.

In this page:
- `<project>` is the Vercel project name. We use `leonida-atlas`; if that name is taken, Vercel shows the URL it gave you instead.
- `<scope>` is the Vercel account slug in preview URLs (`jatins-projects-ca7f6865` for this account).

---

## 0. What you need first (owner list)

| # | Where | What to do |
| --- | --- | --- |
| 1 | **supabase.com/dashboard → New project** | Name `leonida-prod`, the **same region as DEV: Northeast Asia (Tokyo), `ap-northeast-1`**, and a strong database password (keep it in your password manager; nothing here needs it). Then copy the project **ref** (Project Settings → General) into `.env.local` as `SUPABASE_PROJECT_REF_PROD=`. A ref isn't a secret. |
| 2 | **github.com/new** | Create a **Private** repository `leonida-atlas`, with **no** README, .gitignore or licence (it must be empty). Tell Claude the HTTPS URL. |
| 3 | **console.upstash.com → Create database** | `leonida-prod`, in **Tokyo (`ap-northeast-1`)**, next to Supabase and the Vercel functions (§4.2). This keeps rate-limit counters apart from DEV. If the free plan doesn't allow a second database, reuse DEV's (it works, but DEV tests then share counters with production). |
| 4 | **dash.cloudflare.com → Turnstile → your widget → Hostname management** | Add `<project>.vercel.app` (and later your domain). |
| 5 | **Claude's Vercel MCP** | Claude gives you a one-time Vercel consent link (`authorize_team_access`). Open it and approve. Until you do, the MCP can read your account but not projects or domains. |

Later, not needed to go live: Anthropic key (§8.1), domain + Resend (§9), Sentry (§8.3), Twitch/YouTube keys (PROGRESS Phase 5 to-dos).

---

## 1. Push the code to GitHub (Claude, after you say yes)

```powershell
git remote add origin https://github.com/<you>/leonida-atlas.git
git push -u origin main
```

The first push opens Git Credential Manager in your browser. Sign in to GitHub there; Claude never sees it. CI (`.github/workflows/ci.yml`) runs on that push. The cron workflow skips until §6 is done.

## 2. PROD Supabase: schema + seed (Claude, after you say yes)

1. **Dry run.** This lists the 14 migrations and changes nothing:
   ```powershell
   $env:CONFIRM_PROD="<prod-ref>"; pnpm db:push:prod --dry-run
   ```
2. **Real push** (migrations, including `20261125090000_qa_hardening.sql` from D-100, then `seed.sql`; then `SEED_ADMIN_EMAIL` becomes the seed admin through the Management API):
   ```powershell
   $env:CONFIRM_PROD="<prod-ref>"; pnpm db:push:prod
   ```
3. **Check:**
   - the script ends with "The CLI is still linked to DEV";
   - `Get-Content supabase/.temp/project-ref` equals `SUPABASE_PROJECT_REF_DEV`;
   - then clear the confirmation with `Remove-Item Env:CONFIRM_PROD`.

`--remote=<prod-ref>` targets PROD without re-linking the CLI, so DEV stays linked the whole time. If the link were ever changed, `pnpm db:link` puts it back on DEV. The Supabase CLI calls every project's main branch "production" (D-108), so check the ref in its output, not that label.

## 3. PROD Supabase: Auth settings

**Claude (via the Management API, after you say yes), or you in the dashboard:**
- **Authentication → URL Configuration:**
  - **Site URL:** `https://<project>.vercel.app`.
  - **Redirect URLs:** `https://<project>.vercel.app/**`. Add your domain and `www` later (§9). Preview deploys use DEV, so their wildcard goes on DEV (below), not here.
- **Authentication → Emails → Magic link:** make the link
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
  so it works even when opened in another browser (PKCE links don't).

**DEV project, same page:** add `https://<project>-*-<scope>.vercel.app/**` to its Redirect URLs, so sign-in works on Preview deploys.

**You (secrets):**
- **Authentication → Sign In / Providers → Google and Discord:**
  - paste the client IDs and secrets;
  - each provider's callback URL is `https://<prod-ref>.supabase.co/auth/v1/callback` (SETUP §2.5);
  - publish the Google OAuth consent screen, or only test users can sign in.
- **Authentication → Emails → SMTP:** only once you have a domain and Resend (§9).
  - **Until then, the built-in mailer sends magic links only to members of the Supabase project team, a few an hour.** Public email sign-in effectively doesn't work, so Google/Discord sign-in matters more.

## 4. Vercel project

1. **vercel.com/new → Import Git Repository:**
   - when asked, install the **Vercel GitHub app** for **only** the `leonida-atlas` repo;
   - import it with project name `leonida-atlas` and framework **Next.js**;
   - leave the build and install commands on their defaults;
   - press **Deploy**. This first production build **fails** on purpose: production refuses to boot without its keys (D-027). The env vars in §5 fix it.
2. **Settings → Build and Deployment → Node.js Version:** `24.x`. **Settings → Functions → Function Region:** Tokyo, Japan (`hnd1`), next to Supabase (Vercel's default is Washington, D.C., which would add a Pacific round-trip to every database call).
3. **Settings → Environment Variables:** see §5.
4. **Deployments → the latest → Redeploy.**

## 5. Environment variables

**Who sets what:**
- *You* paste secrets (Settings → Environment Variables → Add, choose the environment, mark "Sensitive").
- *Claude* can set the non-secret ones through the Vercel MCP after you say yes.
- Leave anything not listed unset; its feature hides itself (D-023).

**Making a fresh random secret for prod** (it goes to your clipboard, not the screen):

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); (($b | ForEach-Object { $_.ToString("x2") }) -join "") | Set-Clipboard
```

| Variable | Production | Preview | Set by |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_NAME` | `Leonida Atlas` | `Leonida Atlas` | Claude |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` | *(unset: previews use their own host, D-027)* | Claude |
| `NEXT_PUBLIC_SITE_HOSTS` | `<project>.vercel.app` (later `+ domain, www.domain`) | *(unset: Vercel's `VERCEL_URL` is trusted automatically)* | Claude |
| `NEXT_PUBLIC_SHOW_IMPRESSUM` | `false` | `false` | Claude |
| `SITE_COMMERCIAL` | `true` | `true` | Claude |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (builds with the pinned `pnpm@12.21.0`) | `1` | Claude |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<prod-ref>.supabase.co` | `https://<dev-ref>.supabase.co` | Claude |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PROD publishable key | DEV publishable key | **You** |
| `SUPABASE_SECRET_KEY` | PROD secret key | DEV secret key | **You** |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | the `leonida-prod` database | the DEV database | **You** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | your real widget | Cloudflare's public **test** keys: `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` (always pass; preview hosts change every deploy) | You (prod), Claude (preview) |
| `CRON_SECRET` | a **new** random value | any random value | **You** |
| `ANON_HASH_SALT` | a **new** random value (never rotate it later, RUNBOOK §8) | any random value | **You** |
| `ADMIN_EMAIL` | the inbox for removal requests | same | **You** |
| `NEXT_PUBLIC_CONTACT_EMAIL` | a public address on your domain (later) | — | You |
| `ANTHROPIC_MODEL_FAST` / `_SMART`, `VOYAGE_MODEL`, `ASK_MIN_SCORE`, `WIKI_MAX_PAGES_PER_RUN` | as in `.env.example` | same | Claude |
| `INDEXNOW_KEY` | 8–128 letters, digits or dashes (§7.3) | *(unset)* | Claude or you |
| `ANTHROPIC_API_KEY`, `TWITCH_*`, `YOUTUBE_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` | when you have them (§8) | same, or unset | **You** |

`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_*`, `SEED_ADMIN_EMAIL` and `WIKI_CONTACT_EMAIL` are only for local scripts. Don't add them to Vercel.

**Production boots only with:** the Supabase URL, publishable and secret keys, Upstash, Turnstile, `CRON_SECRET`, `ANON_HASH_SALT` and an `https://` `NEXT_PUBLIC_SITE_URL` (D-023, D-027). A failing build log names the missing variable, never its value.

## 6. Crons (GitHub Actions, D-111)

Hobby runs Vercel Cron at most once a day, so `.github/workflows/cron.yml` calls the routes instead:

| Run | Routes |
| --- | --- |
| every hour at :00 | `publish-scheduled`, `twitch-clips`, and `weekly-clips` on Mondays from 06:00 UTC (it freezes the past week once; repeats do nothing) |
| every hour at :30 | `publish-scheduled` |

**Turn it on:** GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `PROD_SITE_URL` = `https://<project>.vercel.app`;
- `CRON_SECRET` = the same value as Vercel Production's `CRON_SECRET`.

**Test it:** **Actions → Cron → Run workflow** (pick a route). The log shows each route's JSON answer. Until the keys exist, `twitch-clips` answers `{ "skipped": … }`, which is fine.

**Budget:** 48 short runs a day is about 1,450 of the private repo's 2,000 free minutes a month. CI uses about 10 minutes per push. GitHub may start scheduled runs a few minutes late, so a scheduled tip goes live within about 30–40 minutes of its time.

**Moving to Pro later:** see §10.

## 7. After the deploy

### 7.1 Smoke test (Claude runs it)

1. Create `.env.prod.local` in the repo folder (git-ignored). You fill it in, not Claude:
   ```
   LIVE_BASE_URL=https://<project>.vercel.app
   LIVE_SUPABASE_URL=https://<prod-ref>.supabase.co
   LIVE_SUPABASE_SECRET_KEY=<PROD secret key>
   ```
   The last two are only for the forum round-trip (a throwaway `e2e-live-…@example.com` member posts a thread; then the member, the thread and its audit rows are deleted).
2. Run:
   ```powershell
   pnpm e2e:live
   ```
   It covers home, `/tips` and a tip page, `/clips` and a clip page, `/ask`, `/forum`, `sitemap.xml`, `robots.txt`, the manifest and 401s on the cron routes, at 390 px and 1440 px.
   - Tip and clip pages are skipped while PROD has none published.
   - If Cloudflare Turnstile challenges the automated browser on "Post thread", that step fails. Do it by hand once with a real account, then delete the thread.
3. Delete `.env.prod.local` afterwards:
   ```powershell
   Remove-Item .env.prod.local
   ```

### 7.2 Search engines (you click)

- **Google Search Console** (search.google.com/search-console):
  1. **Add property → URL prefix** → `https://<project>.vercel.app/`. A *Domain* property is only possible once you own a domain (§9).
  2. **Verify → HTML tag:** give Claude the `content` value. It's public, not a secret. Claude adds it to the site metadata in a one-line commit; after the redeploy, press **Verify**.
  3. **Sitemaps** → submit `sitemap.xml`.
- **Bing Webmaster Tools** (bing.com/webmasters): **Import from Google Search Console** (fastest), or add the site and verify by meta tag the same way. Then **Sitemaps** → submit `https://<project>.vercel.app/sitemap.xml`.
- **Moving to a domain later:**
  - add the new property in both tools;
  - in Search Console use **Settings → Change of address** from the old property.

### 7.3 IndexNow (optional, D-113)

Set `INDEXNOW_KEY` in Vercel Production (any 8–128 letters, digits or dashes; it's public by design) and redeploy. Then:
- the key is served at `https://<project>.vercel.app/api/indexnow` (the IndexNow `keyLocation`), and `robots.txt` allows that path;
- every publish pings Bing (RUNBOOK §1);
- there's no key file in `/public`: the route serves it, so the key isn't in git.

## 8. Before you invite people

1. **Anthropic key** + a monthly spend limit (console.anthropic.com → Billing → Limits). Without it, nearly every new member's post waits in Moderation → Held (PROGRESS Phase 6 to-dos). Add `ANTHROPIC_API_KEY` to Production and redeploy.
2. **Sign in once on PROD** with `SEED_ADMIN_EMAIL` (Google or Discord until email works). You become admin when onboarding finishes (D-041).
3. **Sentry** (optional, D-093):
   - create a Next.js project;
   - set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` (Production + Preview);
   - redeploy;
   - send a test error, then check its stack trace is readable (source maps). If it isn't, set the build command to `next build --webpack`.
4. Review the legal drafts and `/about` (PROGRESS owner to-dos).

## 9. Switching to a custom domain

1. **Buy a domain** with no "GTA", "Rockstar" or "Vice City" in it, at about $10–15 a year for `.com`:
   - **Vercel → Domains → Buy:** simplest, DNS is automatic;
   - or **Cloudflare Registrar** (dash.cloudflare.com → Domain Registration), which sells at cost and is where your Turnstile already is;
   - turn off parking or forwarding at the registrar.
2. **Vercel → Project → Settings → Domains:**
   - add `example.com` and `www.example.com`, and set `www` to **redirect** to the apex;
   - with an outside registrar, add the A/CNAME records Vercel shows;
   - wait for "Valid Configuration".
3. **Update:**
   - Vercel Production `NEXT_PUBLIC_SITE_URL=https://example.com`;
   - `NEXT_PUBLIC_SITE_HOSTS=example.com,www.example.com,<project>.vercel.app`;
   - the GitHub secret `PROD_SITE_URL`;
   - PROD Supabase **Site URL** and **Redirect URLs** (add the apex and `www`);
   - the Turnstile hostnames;
   - Search Console (§7.2).

   Then redeploy.
4. **Resend:**
   - resend.com → Domains → add the domain and its DNS records, and wait for "Verified";
   - set `RESEND_API_KEY` and `EMAIL_FROM="Leonida Atlas <hello@example.com>"` in Vercel;
   - in PROD Supabase → Authentication → Emails → SMTP: host `smtp.resend.com`, port 465, user `resend`, password = the Resend key. **This is what makes public email sign-in work.**
5. Set `NEXT_PUBLIC_CONTACT_EMAIL` and redeploy.

## 10. Moving to Vercel Pro

Pro is needed before ads or affiliate links (Hobby is non-commercial only).
1. Upgrade, then add `vercel.json` with the SPEC §12 schedules:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "crons": [
       { "path": "/api/cron/publish-scheduled", "schedule": "*/10 * * * *" },
       { "path": "/api/cron/twitch-clips", "schedule": "0 * * * *" },
       { "path": "/api/cron/weekly-clips", "schedule": "0 6 * * 1" }
     ]
   }
   ```
   Vercel Cron sends `Authorization: Bearer $CRON_SECRET` from the project's env automatically, and the routes accept GET (D-012).
2. Delete the two repository secrets, so the Actions workflow skips. Or delete `.github/workflows/cron.yml`.
3. Later phases add `wiki-sync` (every 6 h, Phase 7), `digest` and `notify-email` (Phase 12) to the same list.

## 11. Rolling back

- **Code:** Vercel → Deployments → a previous good deployment → **Promote to Production**. It's instant, and env changes are not rolled back.
- **Database:** migrations only go forward. Never undo one by hand on PROD. Write a new migration that fixes it, test it on DEV (`pnpm db:push`, `pnpm test:db`), then run `pnpm db:push:prod` again.
- **Incident:** turn on `MAINTENANCE_MODE` in `/admin/settings` (RUNBOOK §4, §9).
