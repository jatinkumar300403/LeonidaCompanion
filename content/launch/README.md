# Launch content drafts (kit Prompt 13)

Draft launch content for Leonida Atlas, kept as files so the same text can be loaded into DEV now and PROD later (Phase 11). The owner reviews and publishes every article by hand in the CMS.

## What's here

| Path | What |
| --- | --- |
| `launch-facts.json` | `site_settings.launch_facts` for `/launch`: release, platforms, editions + prices, preload, download size. Each item has its source. |
| `manifest.json` | One entry per article: body file, type, slug, title, summary, tags, fact status and source keys. Also the source list and access date. |
| `facts/*.md` | 10 facts, all `confirmed`, each with at least one official Rockstar source. |
| `features/*.md` | 6 feature explainers: What it is → How it works → Tips → What's not confirmed yet → FAQ. |
| `tips/*.md` | 5 pre-launch tips, each opening with "Pre-launch tip — will be updated after release". |

Bodies are plain markdown, with no frontmatter. Metadata lives in `manifest.json`.

## Sourcing rules followed

- Only official Rockstar pages: rockstargames.com (Newswire, the GTA VI site), support.rockstargames.com and store.rockstargames.com. No wikis, leaks, rumours or datamines.
- Written in our own words. Only a few words are quoted from Rockstar, and only text is used: no images or artwork.
- `spoiler_level` is `none` everywhere. Nothing goes beyond Rockstar's own one-line premise.
- Where Rockstar hasn't confirmed something, the article says so ("What's not confirmed yet").
- All sources were accessed on 2026-11-18.

## Loading

```bash
node scripts/load-launch-content.ts --dry-run   # validate only
node scripts/load-launch-content.ts             # create missing drafts + fill empty launch facts (DEV)
node scripts/load-launch-content.ts --update    # also refresh rows still in draft/review, and the facts
```

- Validation uses the CMS's own schemas (`articleInputSchema`, `publishProblems`, `launchFactsSchema`). If anything fails, nothing is written.
- Idempotent: an article with the same type and the same slug or title is skipped. Published and archived rows are never touched.
- DEV only (the `scripts/lib/dev-env.mjs` guard). Phase 11 decides how these files reach PROD.
- Script writes skip cache tags (D-051), so `/launch` shows new facts within about 5 minutes.

## Owner review checklist

- [ ] **Ultimate Edition price.** Rockstar's own sites don't list it, so `launch-facts.json` says "See PlayStation/Xbox store". Add the price in `/admin/launch` if you want one, with a link to the store.
- [ ] **"Good saving habits" tip has no source.** Rockstar hasn't described GTA 6's save system, so the tip stays generic and says so. Add a source after launch.
- [ ] Standard Edition price is the US Rockstar Store code-in-box price ($79.99). Other regions differ.
- [ ] After launch: update the tips and "What's not confirmed yet" sections, then bump "updated".
