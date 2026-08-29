import { MAX_ATTACHMENTS } from "@/domain";

/**
 * Shared hygiene for an issue's `attachments` list, mirroring `sanitizeLinks`.
 * URLs arrive from the composer (freshly minted by the upload Worker) or from a
 * Firestore doc that a public repo's rules are the only guard on, so both Store
 * adapters and the Firestore mapper funnel through here: keep only well-formed
 * `http(s)` URLs, trim, drop duplicates, and cap the count.
 */
export function sanitizeImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) continue;
    if (out.includes(url)) continue;
    out.push(url);
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}
