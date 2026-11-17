# Leonida Atlas — Product & Technical Spec (v1, web)

Unofficial GTA VI guide and community. GTA VI launches **Thursday 19 Nov 2026** on PS5 and Xbox Series X|S. The site must be live and useful on launch day, then grow daily.

---

## 0. Goals & non-goals

**Goals (v1)**
- Be the fastest place to get a **trustworthy answer** to a GTA VI question: curated tips, explained features, sourced facts, AI answers with citations, and a help forum.
- Short, funny or epic **clips** from streamers, shown through official embeds only.
- Mobile-first and app-like (installable PWA, bottom nav). The backend is reusable by a later native app.
- Publishing from a phone in under 60 seconds (quick tip mode), so the owner can post on launch night.
- Top-notch quality: Lighthouse ≥ 95 (mobile) on article pages, WCAG 2.2 AA, no layout shift.

**Non-goals (v1)**
- Interactive map, collectibles tracker, native apps, paid tiers, ads (keep an `<AdSlot>` component behind a feature flag, off), multi-language (keep strings centralized for later i18n).

---

## 1. Information architecture & routes

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Home | ISR 60s |
| `/launch` | Launch Hub: release date, platforms, editions, preload, "first 10 things to do" | ISR |
| `/tips`, `/tips/[slug]` | Tips & Tricks (filters: tag, spoiler-free only) | ISR + on-demand revalidate |
| `/features`, `/features/[slug]` | Features Explained (game mechanics) | ISR |
| `/facts`, `/facts/[slug]` | Facts: confirmed info, trivia, easter eggs, with status badges | ISR |
| `/online` | Online mode: "coming soon" + waitlist; becomes a guides index when `FEATURE_ONLINE=true` | ISR |
| `/ask` | Ask AI (streaming answer + citations) | dynamic |
| `/forum` | Forum home (categories + hot/new threads) | dynamic, cached 30s |
| `/forum/[category]` | Category thread list (sort: hot, new, top, unanswered) | dynamic |
| `/forum/t/[id]/[slug]` | Thread page | dynamic with 30s cache, revalidated on new post |
| `/forum/new` | New thread (auth) | dynamic |
| `/clips` | Clips feed (filters: funny, epic, fail, stunt, glitch; sort: hot, new, top-week) | ISR 60s |
| `/clips/[id]` | Single clip page (shareable, SEO) | ISR |
| `/clips/submit` | Submit clip link (auth) | dynamic |
| `/clips/top/[week]` | Weekly top 10 (e.g. `2026-w47`) | static after week closes |
| `/search?q=` | Unified search across articles, threads, clips | dynamic |
| `/u/[username]` | Public profile | dynamic |
| `/settings` | Profile, notifications, data export, delete account | auth |
| `/admin/*` | CMS, moderation, clips queue, wiki sync, content gaps, users | role mod/admin |
| `/about`, `/disclaimer`, `/privacy`, `/terms`, `/community-guidelines`, `/dmca`, `/credits`, `/contact`, `/impressum` (only if `NEXT_PUBLIC_SHOW_IMPRESSUM=true`) | Legal/static | static |
| `/sitemap.xml` (index + per-section), `/robots.txt`, `/rss.xml`, `/manifest.webmanifest`, `/api/og` | SEO/PWA | — |

**Navigation**
- Desktop header: Logo · Tips · Features · Facts · Forum · Clips · Ask AI · Online (badge "Soon") · search icon · theme toggle · avatar/sign-in.
- Mobile: compact header (logo, search, avatar) plus a **bottom tab bar**: Home · Tips · Ask · Forum · Clips. "More" sheet: Features, Facts, Launch, Online, Settings.
- Footer: section links, legal links, disclaimer (CLAUDE.md rule 3), newsletter mini-form, credits link.

---

## 2. Design system ("Leonida Dusk")

Editorial, neon-sunset mood (Florida at dusk), original artwork only. Feels like a premium magazine plus a game companion app. Dark theme by default (gamers), with a full light theme. The toggle follows the system on first visit.

**Tokens (CSS variables, Tailwind v4 `@theme`)**
- Dark: `--bg #0A0B10`, `--surface #12141C`, `--surface-2 #1A1D28`, `--border #262A38`, `--text #F4F5F9`, `--muted #9AA1B5`
- Light: `--bg #FAFAF7`, `--surface #FFFFFF`, `--surface-2 #F2F2EE`, `--border #E4E4DE`, `--text #10121A`, `--muted #5B6172`
- Accents (both themes): `--pink #FF3D8B`, `--orange #FF9F43`, `--teal #22D3C5`, `--violet #8B5CF6`. Gradient `--dusk: linear-gradient(135deg, #FF3D8B 0%, #FF9F43 100%)`. Status colours: confirmed `--teal`, verified `--violet`, community `--orange`, spoiler `--pink`.
- Check every text/background pair for AA contrast (write a small test that computes it from the tokens).
- Radius 14px for cards and 10px for inputs. Soft shadows in light mode; borders and inner glow in dark mode.

**Type**: Display = *Bricolage Grotesque* (variable, Google Fonts via `next/font`), body = *Inter*, numbers/stats = *JetBrains Mono*. Scale: 14/16/18/22/28/36/48/64. Article body 18px with 1.65 line height and a 68ch max width.

**Motifs**: subtle film-grain noise overlay on hero areas, gradient underline on link hover, a thin dusk-gradient top border on cards, an original palm-silhouette SVG pattern used sparingly. Motion (via the `motion` lib) is limited to card hover lift, tab underline slide and toast. All of it is disabled when `prefers-reduced-motion` is set.

**Core components** (shadcn base, restyled): `Button`, `Badge`, `Card`, `Tabs`, `Sheet`, `Dialog`, `Toast`, `Skeleton`, `Avatar`, `DropdownMenu`, `Tooltip`, plus custom:
- `TipCard` (title, 1-line summary, tags, "helpful" count, spoiler-free tick)
- `FeatureCard` (icon, title, summary)
- `FactCard` (status badge, fact sentence, source domain)
- `StatusBadge` (`confirmed`/`verified`/`community`)
- `SpoilerBlock` / inline spoiler (blurred, tap to reveal, keyboard accessible)
- `ThreadRow` (vote score, title, category chip, replies, solved tick, last activity)
- `VoteButtons` (optimistic UI)
- `ClipCard` + `ClipEmbed` (facade: thumbnail + play button; on click, a consent note on first use, then load the iframe)
- `AskBox` (big input + suggested questions) and `AnswerCard` (streaming markdown, numbered citation chips, feedback)
- `MarkdownRenderer` (shared), `MarkdownEditor` (textarea + toolbar + live preview tab, mobile-friendly), `EmptyState`, `ErrorState`, `SectionHeader`, `BottomNav`, `ThemeToggle`, `CountdownOrStatus` (shows a countdown before launch and "Out now on PS5 & Xbox Series X|S" after, computed from `LAUNCH_AT`).

Build a `/admin/ui` page (admin only) showing every component in every state. Use it for visual QA.

---

## 3. Home page (`/`)
1. **Hero**: headline ("Your unofficial guide to GTA VI"), `CountdownOrStatus`, large `AskBox` with 4 suggested questions, and secondary CTAs (Browse tips · Join the forum).
2. **Latest tips** (6 cards) → `/tips`.
3. **Trending in the forum** (5 hot threads + "Unanswered questions" link).
4. **Clip of the day** (top approved clip in the last 24h, facade embed) + "More clips".
5. **Features explained** grid (6).
6. **Facts strip** (horizontal scroll of FactCards).
7. **Online teaser** with waitlist email field (hidden when `FEATURE_ONLINE=true` and replaced by an "Online guides" block).
8. **Newsletter CTA** (weekly digest).

Each block must handle empty states gracefully (useful on day one, before there's much content).

---

## 4. Content system (Tips, Features, Facts, Online, Launch)

Stored in Supabase (not MDX files) so the owner can publish from a phone.

**Article types**: `tip`, `feature`, `fact`, `online`, `launch`, `guide` (longer walkthrough, future-proof).
**Fields**: see `articles` in §11. Required: title, slug (auto from title, editable, unique per type), summary (≤ 160 chars, used as the meta description), body_md, tags, spoiler_level, status. Facts also require `fact_status` and at least one `sources` entry when `fact_status='confirmed'`.

**Article page template**
- Breadcrumb · Title · meta row (type, updated `x ago`, read time, spoiler badge) · summary lede
- Table of contents (auto from H2/H3, sticky on desktop)
- Body (MarkdownRenderer: callouts `> [!TIP]`, `> [!WARNING]`, spoilers `||text||`, tables, YouTube embeds via `::youtube[id]` directive using the facade)
- **Sources** box (numbered, with domain and access date)
- "Was this helpful?" (👍/👎, one per user or anonymous id, rate-limited) → `helpful_count`
- Related articles (same tags, then embeddings similarity)
- "Still stuck? Ask AI" and "Ask the forum" CTAs (prefilled with the article title)
- JSON-LD: `Article` (+ `FAQPage` when the body has a `## FAQ` section with Q/A pairs), `BreadcrumbList`

**Section index pages**: filter chips (tags), "Spoiler-free only" toggle (on by default), sort (latest, most helpful), cursor-paginated infinite scroll with a real `<a>` "Load more" fallback for SEO.

**Tags (seed)**: beginner, money, combat, driving, stealth, missions, heists, wanted-level, vehicles, weapons, characters, map, activities, social-media, settings, performance, accessibility, online, collectibles, easter-eggs.

**Launch Hub (`/launch`)**: a single `launch` article plus structured blocks fed from a `launch_facts` JSON in `site_settings` (release date/time, platforms, editions with prices, preload info, download size), each item with a source URL. The admin edits it in `/admin/launch`.

**Publishing flow**: draft → (optional) review → published. Publishing triggers: `revalidateTag('articles')` and the type-specific tag; (re)chunking and embedding into `knowledge_chunks` (§7); IndexNow ping (Bing/Yandex) when `INDEXNOW_KEY` is set. Scheduled publish via `published_at` in the future, picked up by the cron.

---

## 5. Help Forum

**Categories (seed, ordered)**
1. Help & Questions (Q&A mode: accepted answers)
2. Tips & Discoveries
3. Missions & Story (spoilers allowed, every post auto-wrapped in a spoiler warning)
4. Online (locked, read-only until `FEATURE_ONLINE=true`)
5. Clips & Moments (discussion)
6. Bugs, Performance & Settings
7. General Discussion
8. Site Feedback

**Threads**: title (10–140 chars), body markdown (≤ 20k chars), category, up to 5 tags, `is_spoiler` toggle (blurs the body in lists and previews). States: open, solved, locked, removed.
**Posts (replies)**: markdown, edit within 30 min (later edits show "edited"), soft delete (shows "[deleted]").
**Voting**: up/down on threads and posts (one per user, toggle). Score = sum. Hot rank = `score / (hours_since + 2)^1.5`, computed in SQL.
**Accepted answer**: the thread author or a mod can mark one post accepted. The thread becomes `solved` and the accepted post is pinned under the question. Accepted answers get embedded into `knowledge_chunks` (source_type `forum_solution`) so Ask AI learns from the community.
**AI suggested answer**: when a thread is created in Help & Questions, run Ask AI on title + body in the background (Next `after()`). If the top retrieval score ≥ `ASK_MIN_SCORE`, insert a post with `is_ai=true`. It's labelled "AI suggestion · may be wrong", shows its citations, and can be voted on and accepted. It never auto-accepts. No AI post when retrieval is weak (no noise).
**Mentions** `@username` → notification. **Quote reply** button.
**Reputation**: +10 accepted answer, +2 per upvote on posts, −1 per downvote, +5 approved clip, +15 tip written by a user that the owner publishes. Shown on profiles; unlocks: links in posts at rep ≥ 20, clip submit at rep ≥ 0 (anyone verified), no rate-limit warning at rep ≥ 100.
**Sorting**: Hot, New, Top (day/week/all), Unanswered (0 replies, or no accepted answer after 24h).
**Thread page JSON-LD**: `QAPage` for Help & Questions threads with an accepted answer, `DiscussionForumPosting` otherwise.

**Safety (mandatory, also required later for App Store/Play approval)**
- Report button on every thread, post, clip and profile (reasons: spam, harassment, hate, sexual content, spoiler without tag, cheating/exploit, leak, impersonation, other).
- Block user (hides their content for you and stops mentions/notifications).
- Users can delete their own content and their account.
- Mod tools: remove/restore, lock, move category, edit tags, ban (temp/perm, reason), shadow-hold new users.
- New account limits (first 24h or rep < 5): max 3 threads/day, 20 posts/day, no links.
- **AI moderation pre-check** (§8) on every thread/post/clip submission → `allow` | `hold` | `reject`.
- All mod actions are written to `moderation_actions` (audit log).

---

## 6. Clips

**Rule**: embed only. Supported: Twitch clips, YouTube (Shorts and videos), TikTok. Target 15–25s, accept ≤ 60s.

**Submission (`/clips/submit`, auth required)**
1. User pastes a URL. Server-side `resolveClip(url)`:
   - Twitch: parse the clip slug (`clips.twitch.tv/<slug>` or `twitch.tv/<channel>/clip/<slug>`) → Helix `GET /helix/clips?id=` (app access token, cached in Redis until expiry) → title, broadcaster, creator, duration, thumbnail, game_id, view_count. **Reject if `game_id` ≠ GTA VI's Twitch game id** (resolved once via `GET /helix/games?name=Grand Theft Auto VI` and cached; override with `TWITCH_GTA6_GAME_ID`).
   - YouTube: parse the id (watch, youtu.be, shorts) → YouTube Data API v3 `videos.list?part=snippet,contentDetails,status` → title, channel, duration, thumbnail, `status.embeddable` (reject if false).
   - TikTok: oEmbed `https://www.tiktok.com/oembed?url=` → title, author, thumbnail. Duration is unknown, so the mod confirms it.
2. User picks a category (funny, epic, fail, stunt, glitch-funny, other) and an optional caption (≤ 140 chars). They tick "This isn't a story spoiler / cutscene".
3. Dedupe on `(platform, external_id)`. AI moderation on title + caption. Status → `pending`.
4. A mod approves or rejects in `/admin/clips` (one tap, mobile-friendly, keyboard shortcuts A/R on desktop).

**Auto-candidates**: cron (hourly) pulls top Twitch clips for the GTA VI game id from the last 24h (`first=50`, by views), skips duplicates and inserts them as `pending` with `source='twitch_auto'`. The owner just approves the best ones. Nothing is auto-published.

**Display**
- `ClipEmbed` facade: thumbnail (next/image from the platform CDN, `remotePatterns` set), duration chip, creator name and link, platform icon.
- On click, the iframe loads. On first ever click, show a short notice: "This loads content from Twitch/YouTube/TikTok, which may set cookies." Remember the choice in localStorage (try/catch).
- Twitch iframe: `https://clips.twitch.tv/embed?clip=<slug>&parent=<host>` with **every** host the site runs on (`NEXT_PUBLIC_SITE_HOSTS` comma list + `localhost` + the current Vercel preview host).
- YouTube: `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&playsinline=1`.
- TikTok: official `blockquote` + `embed.js`, loaded on demand.
- Always credit the creator under the clip with a link to their channel. A "Watch on Twitch/YouTube" link sits next to it.
- Votes on clips. Feed sort: Hot (votes + recency), New, Top this week.
- **Weekly Top 10** page generated each Monday 06:00 UTC for the previous ISO week (frozen snapshot in `clip_weekly`).
- **Removal**: creators can request removal through `/dmca` (or the "I'm the creator" link on the clip page). An admin removes it in one click. Target removal time < 24h.

---

## 7. Knowledge base & wiki ingestion

**Sources registry** `src/config/sources.ts` (licence-aware; add more later):

```ts
export const SOURCES = [
  {
    id: "fandom-gta",
    name: "GTA Wiki (Fandom)",
    api: "https://gta.fandom.com/api.php",
    baseUrl: "https://gta.fandom.com/wiki/",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    commercialUse: true,
    attribution: "Text from GTA Wiki on Fandom, CC BY-SA 3.0. Authors listed in the page history.",
    seedCategories: ["Category:Grand Theft Auto VI"], // verify the exact names with the API at build time
    enabled: true,
  },
  {
    id: "grand-theft-wiki",
    name: "Grand Theft Wiki",
    api: "https://www.grandtheftwiki.com/api.php",
    baseUrl: "https://www.grandtheftwiki.com/",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    commercialUse: true,
    // Their licence page requires a prominent, contextual link to GrandTheftWiki.com on every page using its content,
    // stating the content came from Grand Theft Wiki and that its authors are listed there.
    attribution: "Content from Grand Theft Wiki (GrandTheftWiki.com), CC BY-SA 3.0. Authors listed on Grand Theft Wiki.",
    seedCategories: ["Category:GTA VI"],
    enabled: true,
  },
  {
    id: "gta-wiki-independent",
    name: "GTA Wiki (gta.wiki)",
    api: "https://gta.wiki/api.php",
    baseUrl: "https://gta.wiki/w/",
    license: "CC BY-NC-SA",
    commercialUse: false, // NON-COMMERCIAL: never ingest while SITE_COMMERCIAL=true; link out only
    enabled: false,
  },
] as const;
```

The ingester **refuses** any source with `commercialUse:false` when `SITE_COMMERCIAL=true` (unit test this).

**Ingestion pipeline** (`scripts/ingest-wiki.ts`, also exposed as `POST /api/cron/wiki-sync`, guarded by `CRON_SECRET`)
1. For each enabled source: list pages under the seed categories (MediaWiki `list=categorymembers`, recurse subcategories to depth 2, `cmlimit=max`), plus pages whose title contains "GTA VI" / "Grand Theft Auto VI" (`list=search`).
2. Fetch the latest revision wikitext in batches of 50 (`prop=revisions&rvprop=ids|content|timestamp&rvslots=main`). Skip unchanged `revision_id`.
3. Convert wikitext to clean text with `wtf_wikipedia` (keep headings, lists, infobox key/values, drop templates/navboxes/images/refs).
4. Store in `wiki_pages`, then chunk (≈ 350–500 tokens, 60-token overlap, split on headings, carry `title > section` breadcrumb in each chunk).
5. Embed with Voyage (`VOYAGE_MODEL`, default `voyage-4-lite`; `input_type: "document"`) and upsert `knowledge_chunks`. Delete chunks of removed pages.
6. Etiquette: a descriptive `User-Agent` (`LeonidaAtlasBot/1.0 (+https://<domain>/about; <contact email>)`), ≤ 1 request/second per source, `maxlag=5`, exponential backoff on 429/503, and a hard page cap per run (`WIKI_MAX_PAGES_PER_RUN`, default 500). Log a run summary to `ingest_runs`.

**Own content** is also indexed: published articles (source_type `article`, highest trust) and accepted forum answers (`forum_solution`). Both are re-embedded on publish or accept.

---

## 8. AI features

### 8.1 Ask AI (`/ask`, and the AskBox anywhere)
- **Retrieval (hybrid)**: embed the query (`input_type: "query"`) → top 20 by cosine (pgvector HNSW) plus top 20 by Postgres full-text (`websearch_to_tsquery`) → **Reciprocal Rank Fusion** (k=60) → boost by source trust (article ×1.3, forum_solution ×1.1, wiki ×1.0) → top 8 chunks, max 2 per page.
- **`top_score`** = the cosine similarity of the best vector match (0–1). It is compared against `ASK_MIN_SCORE` (default 0.45; tune it with the eval set in Prompt 8). RRF scores are only used for ordering.
- **Spoiler filter**: by default exclude chunks from pages flagged as story-spoiler (articles with `spoiler_level='major'`, wiki sections named like "Plot", "Ending", "Story"). The user can toggle "Include story spoilers".
- **Generation**: Anthropic Messages API, streaming. Model `ANTHROPIC_MODEL_FAST` (default `claude-haiku-5-5`). `max_tokens` 700.
- **System prompt** (store in `src/server/ai/prompts.ts`):
  ```
  You are the answer engine of an unofficial GTA VI guide site. Answer ONLY from the numbered sources provided.
  - If the sources do not contain the answer, say: "Not confirmed yet." and suggest asking the community forum. Never guess
    mission names, locations, prices, dates or numbers.
  - Cite every factual sentence with [n] matching the source numbers.
  - Be concise: a direct answer first (1–2 sentences), then up to 5 short bullets of steps or details if useful.
  - No story spoilers unless the user enabled spoilers; if a source contains spoilers, say "This involves story spoilers" instead.
  - Never give cheats, exploits, glitches for online modes, mods, piracy, or leaked content.
  - You are not affiliated with Rockstar Games.
  ```
- **Response UI**: streaming markdown, citation chips `[1]` (hover/tap shows title, source and licence), "Sources" list with licence lines (CC BY-SA attribution required for wiki-derived answers), 👍/👎, "Ask the community" (opens `/forum/new` prefilled with the question and the AI answer quoted), "Copy".
- **Limits**: anonymous 5/day (Turnstile required), signed-in 30/day, admin unlimited. Cache identical normalized questions for 6h (Redis key = hash(question + spoilerFlag)).
- **Logging**: `ask_logs` (question, retrieved chunk ids + scores, answer, model, tokens, latency, feedback). Anonymous users are stored with a hashed anon id only.
- **Content gaps** (`/admin/gaps`): questions with top score < `ASK_MIN_SCORE` or 👎, clustered by embedding similarity (simple greedy clustering, threshold 0.85), sorted by frequency. A "Write a tip" button opens the editor prefilled. This tells the owner what to write next.

### 8.2 AI moderation
- On every thread, post, clip submission and profile bio: call `ANTHROPIC_MODEL_FAST` with a strict JSON schema output:
  `{ "action": "allow"|"hold"|"reject", "labels": [...], "reason": "short" }`
  Labels: spam, harassment, hate, sexual, self_harm, doxxing, cheating_or_exploit, leak, untagged_spoiler, off_topic.
- Rules: `reject` for clear spam, hate or sexual content, doxxing. `hold` for self_harm (also notify admins), cheating_or_exploit, leak, harassment, untagged_spoiler (the user is told: "add a spoiler tag and resubmit"). Otherwise `allow`.
- If the moderation API fails, `allow` for users with rep ≥ 20, `hold` for others. Never block the whole site on the AI call (timeout 4s).
- Held items appear in `/admin/moderation` with labels and reason.

---

## 9. Auth, profiles, notifications, newsletter

- **Supabase Auth**: email magic link + Google + Discord OAuth. Sign-up requires: a unique username (3–20 chars, `[a-z0-9_]`, reserved list: admin, mod, rockstar, official, support…), a checkbox "I am 16 or older" (stored as `age_confirmed_at`) and accepting Terms + Community Guidelines. Turnstile on the sign-up form.
- Supabase emails are sent via Resend SMTP (configure in the Supabase dashboard) and use branded templates.
- **Profile**: avatar (upload to Storage `avatars/`, square crop, ≤ 2MB, converted to WebP), display name, bio (≤ 280), platform (PS5 / Xbox Series / Both), reputation, joined date, threads, posts, approved clips.
- **Settings**: edit profile, notification prefs, **export my data** (JSON download of profile, threads, posts, votes, clips, asks), **delete account** (hard-deletes the profile and auth user; threads and posts are kept as "[deleted user]" with the body replaced by "[deleted]" if the user ticks "also remove my posts").
- **Notifications** (in-app bell + optional email): reply to my thread, reply to my post, mention, answer accepted, clip approved/rejected, mod action on my content. Email for replies/mentions is off by default (opt-in), batched hourly.
- **Newsletter**: double opt-in (Resend), weekly digest (top tips, top threads, top clips of the week) sent Monday 08:00 UTC by cron; one-click unsubscribe (List-Unsubscribe header). Separate list flag `online_waitlist` for the Online page form.

---

## 10. Admin (`/admin`, role mod or admin; some screens admin-only)
- **Dashboard**: today's counts (new threads, posts, asks, clips pending, reports open), Ask AI 👍 rate, top searches, last wiki sync status.
- **Articles**: list with filters; editor with **Quick Tip mode** (title + 2–5 sentences + optional source URL + tags → publish), full mode (markdown editor with live preview, cover image upload, TOC preview, SEO preview of the Google snippet and OG image, sources editor, spoiler level, fact status, schedule). Autosave drafts every 5s. Works one-handed on a phone.
- **Launch Hub editor** (`site_settings.launch_facts`).
- **Moderation queue**: held items, reports, with one-tap actions; ban user dialog.
- **Clips queue**: pending (user + twitch_auto), preview the embed in place, approve/reject with reason.
- **Content gaps** (§8.1).
- **Wiki sync**: last runs, pages count per source, "Run now" button, per-source enable toggle (respects licence rules).
- **Users**: search, view, change role (admin only), ban/unban.
- **Feature flags** in `site_settings`: `FEATURE_ONLINE`, `FEATURE_ADS`, `FEATURE_ASK_ANON`, `MAINTENANCE_MODE`.

---

## 11. Database (Supabase Postgres) — create via migrations in `supabase/migrations`

Extensions: `vector`, `pg_trgm`, `unaccent`, `citext`.

```
profiles(id uuid pk references auth.users on delete cascade, username citext unique not null, display_name text,
  avatar_url text, bio text, platform text check in ('ps5','xbox','both') null, role text check in ('user','mod','admin') default 'user',
  reputation int default 0, is_banned bool default false, banned_until timestamptz, age_confirmed_at timestamptz not null,
  notify_email_replies bool default false, created_at timestamptz default now())

articles(id uuid pk, type text check in ('tip','feature','fact','online','launch','guide'), slug text, title text,
  summary text check (char_length(summary) <= 160), body_md text, cover_image_url text, tags text[] default '{}',
  status text check in ('draft','review','published','archived') default 'draft',
  spoiler_level text check in ('none','minor','major') default 'none',
  fact_status text check in ('confirmed','verified','community') null,
  sources jsonb default '[]',          -- [{title,url,accessed_at}]
  author_id uuid references profiles, published_at timestamptz, updated_at timestamptz default now(),
  helpful_up int default 0, helpful_down int default 0, view_count int default 0,
  search tsvector generated always as (setweight(to_tsvector('english', coalesce(title,'')),'A') ||
     setweight(to_tsvector('english', coalesce(summary,'')),'B') || setweight(to_tsvector('english', coalesce(body_md,'')),'C')) stored,
  unique(type, slug))

forum_categories(id serial pk, slug text unique, name text, description text, sort_order int, is_qa bool, is_locked bool,
  spoilers_allowed bool default false)

threads(id bigserial pk, category_id int references forum_categories, author_id uuid references profiles, title text, slug text,
  body_md text, tags text[], is_spoiler bool default false,
  status text check in ('open','solved','locked','removed','held') default 'open',
  accepted_post_id bigint null, score int default 0, reply_count int default 0, last_activity_at timestamptz default now(),
  created_at timestamptz default now(), edited_at timestamptz, search tsvector generated ... (title A, body C))

posts(id bigserial pk, thread_id bigint references threads on delete cascade, author_id uuid references profiles null,
  body_md text, is_ai bool default false, ai_sources jsonb, score int default 0,
  status text check in ('visible','removed','held','deleted') default 'visible', created_at timestamptz default now(), edited_at timestamptz)

votes(user_id uuid references profiles on delete cascade, target_type text check in ('thread','post','clip'),
  target_id bigint, value smallint check (value in (-1,1)), created_at timestamptz default now(),
  primary key(user_id, target_type, target_id))

article_feedback(article_id uuid references articles on delete cascade, voter_key text, value smallint, created_at timestamptz,
  primary key(article_id, voter_key))   -- voter_key = user id or hashed anon id

clips(id bigserial pk, platform text check in ('twitch','youtube','tiktok'), external_id text, url text,
  title text, caption text, creator_name text, creator_url text, duration_sec int, thumbnail_url text,
  category text check in ('funny','epic','fail','stunt','glitch','other'),
  source text check in ('user','twitch_auto') default 'user', submitted_by uuid references profiles null,
  status text check in ('pending','approved','rejected','removed') default 'pending', reject_reason text,
  score int default 0, views_on_platform int, created_at timestamptz default now(), approved_at timestamptz,
  unique(platform, external_id))

clip_weekly(week text pk, clip_ids bigint[], created_at timestamptz)

reports(id bigserial pk, reporter_id uuid references profiles, target_type text, target_id text, reason text, details text,
  status text check in ('open','actioned','dismissed') default 'open', resolved_by uuid, resolved_at timestamptz, created_at timestamptz)

blocks(blocker_id uuid, blocked_id uuid, created_at timestamptz, primary key(blocker_id, blocked_id))

moderation_actions(id bigserial pk, actor_id uuid null, actor_type text check in ('human','ai'), action text, target_type text,
  target_id text, labels text[], reason text, created_at timestamptz default now())

notifications(id bigserial pk, user_id uuid references profiles on delete cascade, type text, payload jsonb,
  read_at timestamptz, emailed_at timestamptz, created_at timestamptz default now())

newsletter_subscribers(id bigserial pk, email citext unique, status text check in ('pending','active','unsubscribed'),
  lists text[] default '{digest}', confirm_token text, created_at timestamptz, confirmed_at timestamptz)

wiki_pages(id bigserial pk, source_id text, page_id bigint, title text, url text, revision_id bigint, license text,
  content_text text, is_spoiler bool default false, fetched_at timestamptz, unique(source_id, page_id))

knowledge_chunks(id bigserial pk, source_type text check in ('article','forum_solution','wiki'), source_ref text,
  title text, section text, url text, license text null, attribution text null, is_spoiler bool default false,
  chunk_index int, content text, embedding vector(1024), tsv tsvector generated always as (to_tsvector('english', content)) stored,
  updated_at timestamptz default now())
  -- indexes: HNSW on embedding (vector_cosine_ops), GIN on tsv, btree on (source_type, source_ref)

ask_logs(id bigserial pk, user_id uuid null, anon_hash text null, question text, include_spoilers bool, chunk_ids bigint[],
  top_score real, answer text, model text, input_tokens int, output_tokens int, latency_ms int, feedback smallint,
  created_at timestamptz default now())

ingest_runs(id bigserial pk, source_id text, started_at timestamptz, finished_at timestamptz, pages_seen int, pages_changed int,
  chunks_upserted int, errors jsonb)

site_settings(key text pk, value jsonb, updated_at timestamptz)
```

**SQL functions/triggers**
- `handle_new_user()` → creates the profile row from sign-up metadata.
- Vote triggers keep `threads.score`, `posts.score`, `clips.score` correct; reputation triggers (§5).
- `posts` insert → `threads.reply_count += 1`, `last_activity_at = now()`; notify the thread author and mentions.
- `match_chunks(query_embedding vector, match_count int, include_spoilers bool)` and `search_chunks_fts(q text, ...)` for retrieval.
- `hot_threads(category_id, limit, cursor)` view/function.

**RLS (summary, write a test for each)**
- Public read: published articles; approved clips; visible threads/posts (excluding `held`/`removed` unless author or mod); profiles (public columns only, via a view `public_profiles`).
- Insert: authenticated, not banned, `author_id = auth.uid()`.
- Update/delete: owner (within edit rules) or `role in ('mod','admin')`.
- `votes`, `blocks`, `notifications`: only the owner.
- `ask_logs`, `ingest_runs`, `moderation_actions`, `reports` (read), `wiki_pages`, `knowledge_chunks` (write), `site_settings` (write): service role / admin only. `knowledge_chunks` is read only through the security-definer retrieval functions.

**Storage buckets**: `avatars` (public read, owner write), `article-images` (public read, admin write). Max 5MB, images only.

Seed: forum categories, tags, site_settings defaults, 1 admin (the owner's email, from `SEED_ADMIN_EMAIL`).

---

## 12. Integrations & environment
See `.env.example` for the full list. Summary:

| Service | Used for |
|---|---|
| Supabase | DB, Auth (email, Google, Discord), Storage, pgvector |
| Anthropic API | Ask AI, AI suggested answers, AI moderation |
| Voyage AI | Embeddings (`voyage-4-lite`, 1024 dims) |
| Twitch Helix | Clip metadata + top GTA VI clips (app access token) |
| YouTube Data API v3 | Clip metadata, embeddable check |
| TikTok oEmbed | Clip metadata (no key) |
| Fandom / Grand Theft Wiki MediaWiki APIs | Knowledge ingestion (licence-aware) |
| Upstash Redis | Rate limits, caches (Twitch token, Ask answers) |
| Cloudflare Turnstile | Bot protection on public writes |
| Resend | Auth emails (SMTP), notifications, newsletter |
| Sentry | Errors + performance |
| Vercel | Hosting, Analytics, Cron (Pro). The Hobby plan is non-commercial only, so switch to Pro before enabling ads/affiliate. |
| IndexNow (optional) | Faster Bing indexing on publish |

**Crons** (`vercel.json` crons on Pro; fallback `.github/workflows/cron.yml` hitting the same routes with `CRON_SECRET`):
- `/api/cron/wiki-sync` every 6h
- `/api/cron/twitch-clips` hourly
- `/api/cron/publish-scheduled` every 10 min
- `/api/cron/weekly-clips` Monday 06:00 UTC
- `/api/cron/digest` Monday 08:00 UTC
- `/api/cron/notify-email` hourly

---

## 13. SEO, performance, PWA, analytics

**SEO**
- Titles: `{Title} – GTA 6 {Section} | {SiteName}`. Meta description = summary. Canonicals everywhere. `noindex` on search, settings, admin, forum/new, held content and thin threads (0 replies and < 200 chars body for 7 days).
- Dynamic OG images (`/api/og`, `next/og`): dusk gradient, section label, title, site name. No Rockstar art.
- Sitemaps split by section with `lastmod`; `rss.xml` for articles.
- JSON-LD: `WebSite` + `SearchAction` (home), `Article`, `FAQPage`, `BreadcrumbList`, `QAPage` / `DiscussionForumPosting`, `VideoObject` (clip pages, `embedUrl` = platform embed, with `uploadDate`, `thumbnailUrl`).
- Internal linking: related articles, "mentioned in the forum" links, tag pages.

**Performance budgets**: LCP < 2.0s on mid-range mobile/4G, CLS < 0.05, INP < 200ms, JS < 150KB gzipped on article pages. Images via `next/image` (AVIF/WebP). Fonts via `next/font` (swap, subset). Embeds only on click. Server Components by default; client components only for interactivity.

**PWA (Serwist)**: manifest (name, short_name, dusk theme colour, maskable icons generated from an original logo mark), install prompt (custom banner after the 2nd visit), offline page, cache-first for static assets, stale-while-revalidate for article pages (read guides offline).

**Analytics**: Vercel Web Analytics (cookieless) plus custom events: `ask_submitted`, `ask_feedback`, `clip_played`, `thread_created`, `post_created`, `article_helpful`, `newsletter_signup`, `pwa_installed`. No third-party ad/tracking cookies in v1, so no cookie banner is needed apart from the embed notice. Add a certified CMP before ever enabling ads for EU visitors.

**Security headers**: strict CSP (frame-src clips.twitch.tv player.twitch.tv www.youtube-nocookie.com www.tiktok.com challenges.cloudflare.com; img-src self + platform thumbnail CDNs + Supabase storage), HSTS, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal, X-Content-Type-Options.

---

## 14. Legal & policy pages (write clear, plain-English drafts; owner reviews)
- **Disclaimer**: unofficial, not affiliated (rule 3); trademarks belong to their owners; information may be inaccurate.
- **Privacy**: what's collected (account, content, hashed anon ids for limits, analytics without cookies), processors (Supabase, Vercel, Anthropic, Voyage, Resend, Upstash, Cloudflare, Sentry), retention, GDPR rights (export/delete in Settings), contact.
- **Terms**: 16+, user content licence to the site (non-exclusive, to display and to use accepted answers in AI answers), prohibited content, termination.
- **Community Guidelines**: be helpful, tag spoilers, no cheats/exploits/leaks/mods/piracy, no harassment, no self-promotion spam, clip rules (no isolated cutscenes or endings, credit creators).
- **DMCA / Content removal**: form (name, email, URL, ownership statement); creators can request clip removal.
- **Credits**: wiki sources with licences and attribution, open-source licences, and "Clips belong to their creators and are shown via official embeds."
- **Impressum**: optional (toggle), for operating commercially from Germany.

---

## 15. Testing & acceptance

**Unit (Vitest)**: slugify, clip URL parsers (all URL shapes, invalid input), Twitch game-id check, licence filter (`commercialUse:false` blocked), wikitext cleaner, chunker, RRF merge, hot-rank formula, spoiler markdown plugin, reputation calculator, rate-limit keying, contrast check of design tokens.

**RLS tests**: SQL tests (pgTAP or supabase-js against DEV with test users): anon can't read held posts; a user can't edit someone else's post; a banned user can't insert; a user can't read others' notifications; a non-admin can't write articles.

**E2E (Playwright, mobile 390×844 + desktop 1440×900)**
1. Sign up (magic link mocked in test env) → choose username → age checkbox → lands on home.
2. Create thread in Help & Questions → AI suggestion appears (Anthropic mocked) → another user replies → author accepts → thread shows Solved.
3. Report a post → appears in the mod queue → mod removes it → it's hidden for the public.
4. Submit a YouTube clip (API mocked) → pending → admin approves → shows in `/clips` → facade click loads the iframe.
5. Ask AI question → streaming answer with citations → 👎 → appears in content gaps.
6. Admin Quick Tip publish from a phone viewport → visible on `/tips` within a revalidation cycle.
7. Spoiler block hidden by default, revealed on click/Enter.
8. Delete account → content shows "[deleted user]".

**Quality gates before deploy**: typecheck, lint, unit, e2e green; Lighthouse CI on `/`, `/tips/[slug]`, `/forum`, `/clips` (mobile ≥ 95 performance/accessibility/best-practices/SEO); axe scan with 0 serious issues.

---

## 16. Project structure

```
src/
  app/(site)/...           public routes
  app/(auth)/...           sign-in, callback, onboarding
  app/admin/...            admin routes
  app/api/...              route handlers (ask stream, cron/*, og, revalidate, clips/resolve)
  components/{ui,layout,articles,forum,clips,ask,admin,shared}/
  config/{site.ts,sources.ts,nav.ts,tags.ts}
  server/{articles,forum,clips,ask,ai,moderation,wiki,notifications,newsletter,admin,auth}/
  lib/{markdown,validation,ratelimit,turnstile,seo,utils}/
  emails/                  React Email templates
  types/database.ts        generated
supabase/{migrations,seed.sql,tests}
scripts/{ingest-wiki.ts,seed-dev.ts}
e2e/
docs/{SPEC.md,PROGRESS.md,DECISIONS.md,CONTENT_GUIDE.md}
```

---

## 17. Later (not v1, but don't block it)
- Native app (Expo/React Native or Capacitor) on the same Supabase backend and `/api/ask`.
- Interactive map with community pins (moderated), a 100% checklist tracker.
- Online mode guides when Rockstar releases them (`FEATURE_ONLINE`).
- Hindi/German UI (strings centralized from day one).
- Ads (certified CMP first), affiliate links (clearly labelled).
