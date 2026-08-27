/**
 * Compact "time since" label for timestamps in the feed and issue rows:
 * `now`, `9m`, `3h`, `4d`, `2w`, `5mo`, `1y`.
 *
 * Pure: the caller passes `now` (epoch ms). Future timestamps clamp to `now`.
 */
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(epochMs: number, now: number): string {
  const diff = Math.max(0, now - epochMs);

  if (diff < MIN) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo`;
  return `${Math.floor(diff / YEAR)}y`;
}
