# SETUP — accounts, keys and connectors (do this before Prompt 0)

Takes about 60–90 minutes. Paste every key into `.env.local` (copy it from `.env.example`). Never commit `.env.local`.

## 0. Your machine
- Node.js LTS (22+), `corepack enable` (gives you pnpm), Git, a GitHub account.
- Claude Code installed and signed in (follow the official setup page in Anthropic's docs).
- Create an empty folder `leonida-atlas/`, then copy into it: `CLAUDE.md`, `.mcp.json`, `.env.example`, and the `docs/` folder from this kit. Run `git init`.
- Add `.env.local` to `.gitignore` now.

## 1. Domain (10 min)
- Buy a domain **without "GTA", "Rockstar" or "Vice City" in it** (e.g. leonidaatlas.com). Cloudflare Registrar sells at cost and gives you DNS + Turnstile in one place.
- If you pick a different name, change `NEXT_PUBLIC_SITE_NAME` and `EMAIL_FROM`.

## 2. Supabase (15 min)
1. Create **two** projects: `leonida-dev` and `leonida-prod`. Use the same region for both, and match Vercel's function region. US East (N. Virginia) is a good default for a global gaming audience.
2. For each: copy the Project URL, the publishable/anon key, the secret/service_role key, and the project ref. Local `.env.local` uses DEV; PROD values go only into Vercel's Production env.
3. Create a Personal Access Token (Account → Access Tokens) → `SUPABASE_ACCESS_TOKEN`.
4. Auth → URL configuration (both projects): Site URL = your site URL. Redirect URLs: `http://localhost:3000/**`, `https://yourdomain.com/**`, `https://www.yourdomain.com/**`, `https://*-yourvercelteam.vercel.app/**`.
5. Auth → Providers:
   - **Google**: Google Cloud Console → APIs & Services → OAuth consent screen (External) → Credentials → OAuth client (Web). Authorised redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase.
   - **Discord**: discord.com/developers → New Application → OAuth2 → add the same callback URL → paste the client ID and secret into Supabase.
6. Auth → SMTP: use Resend (step 8). Host `smtp.resend.com`, port 465, user `resend`, password = Resend API key.

## 3. Anthropic API (5 min)
- console.anthropic.com → API key → `ANTHROPIC_API_KEY`. **Set a monthly spend limit** (Billing/Limits) before launch.
- Models are already set in `.env.example` (`claude-haiku-5-5` fast, `claude-sonnet-5-5` smart).

## 4. Voyage AI (3 min)
- dash.voyageai.com → API key → `VOYAGE_API_KEY`. Model `voyage-4-lite` (1024 dims, which matches the DB column).

## 5. Twitch (5 min)
- Your Twitch account needs 2FA enabled. Then dev.twitch.tv/console → Register Your Application → name, OAuth Redirect `http://localhost`, category "Website Integration", client type Confidential → copy the Client ID and generate a Secret → `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.

## 6. YouTube Data API (5 min)
- Same Google Cloud project → Library → enable **YouTube Data API v3** → Credentials → API key → restrict it to YouTube Data API v3 → `YOUTUBE_API_KEY`.

## 7. Cloudflare Turnstile (3 min)
- Cloudflare dashboard → Turnstile → Add widget. Hostnames: `localhost`, your domain. Mode: Managed → site key + secret.

## 8. Resend (10 min)
- resend.com → API key → `RESEND_API_KEY`. Add your domain, then add the DNS records it shows (SPF/DKIM) at your DNS provider and wait for "Verified". Set `EMAIL_FROM` to an address on that domain.

## 9. Upstash Redis (3 min)
- console.upstash.com → Create Redis database (same region as Vercel) → REST URL + REST token.

## 10. Sentry (5 min)
- sentry.io → New project → Next.js → DSN, org slug, project slug. Settings → Auth Tokens → create one → `SENTRY_AUTH_TOKEN`.

## 11. Vercel (5 min)
- Sign up with GitHub. The **Hobby plan is for non-commercial personal use only**, so move to **Pro** before you add ads or affiliate links. Pro also allows more frequent crons. Until then the kit falls back to GitHub Actions crons.

## 12. Secrets you generate
```
openssl rand -hex 32   # → CRON_SECRET
openssl rand -hex 32   # → ANON_HASH_SALT
```

## 13. Connect Claude Code's MCP servers
The kit includes `.mcp.json` (project scope). Edit `YOUR_DEV_PROJECT_REF` in it to your **DEV** ref. Never point it at prod. The Supabase server is set to read-only on purpose: Claude Code changes the schema through migration files and the Supabase CLI, which keeps every change reviewable.

Or add them by command instead:
```
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add playwright npx @playwright/mcp@latest
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_REF&read_only=true&features=docs,database,debugging,development"
claude mcp add --transport http vercel https://mcp.vercel.com
# optional
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer YOUR_GITHUB_PAT"
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```
Then:
```
npx playwright install chromium
claude            # start Claude Code in the project folder
/mcp              # sign in to supabase, vercel (and others) when prompted
```
Inside Claude Code, use `/permissions` to always allow `pnpm` commands, so it doesn't stop on every test run.

## 14. Before launch day
- Anthropic and Voyage spend limits set.
- Google OAuth consent screen published (otherwise only test users can sign in with Google).
- Search Console + Bing Webmaster verified (Prompt 11 tells you when).
- Read Fandom's Terms of Use and each wiki's licence page once, then decide whether to enable the scheduled wiki sync. The kit uses only the official API, rate-limits itself, credits every source and skips non-commercial (NC) licences.
- If you run the site commercially from Germany, you likely need an Impressum. Set `NEXT_PUBLIC_SHOW_IMPRESSUM=true` and fill it in. Get proper legal advice if unsure.
