/**
 * ISO 8601 durations as the YouTube Data API returns them (`PT1M5S`, `PT45S`, `P0D` for live
 * streams). Returns whole seconds (rounded), or null when the value isn't a duration.
 */
const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export function parseIsoDuration(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = ISO_DURATION.exec(value.trim());
  if (!match || value.trim() === "P" || value.trim().endsWith("T")) return null;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 86_400 + Number(hours ?? 0) * 3_600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
  return Math.round(total);
}

/** Seconds → ISO 8601 for JSON-LD (`PT24S`, `PT1M5S`). */
export function toIsoDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `PT${rest}S`;
  return rest === 0 ? `PT${minutes}M` : `PT${minutes}M${rest}S`;
}
