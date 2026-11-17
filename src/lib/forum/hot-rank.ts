/**
 * SPEC §5 hot rank: score / (hours_since + 2)^1.5. The database computes the same value in
 * `public.hot_rank()`; the DB tests check the two agree.
 */
export function hotRank(score: number, createdAt: Date, now: Date = new Date()): number {
  const hours = Math.max((now.getTime() - createdAt.getTime()) / 3_600_000, 0);
  return score / Math.pow(hours + 2, 1.5);
}
