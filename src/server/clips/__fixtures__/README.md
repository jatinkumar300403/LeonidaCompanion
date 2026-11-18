# Platform API fixtures (Phase 5)

Recorded response shapes for the clip resolvers' unit tests and the dev-only E2E mock
(`../dev-mock.ts`). No test makes a live network call.

The platform keys weren't available when these were written, and TikTok is blocked from the
build machine's network (India), so every file follows the response documented by the platform
(Twitch API reference, YouTube Data API v3 `videos` resource, TikTok oEmbed docs). Ids,
names and the GTA VI game id are placeholders.

**Once the keys are in:** replace these with real responses (see docs/PROGRESS.md, "Verify against
the live APIs") and re-run `pnpm test`.
