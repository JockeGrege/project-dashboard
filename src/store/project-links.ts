import { projectLinkSchema, type ProjectLink } from "@/domain";

/**
 * Shared field hygiene for the two Store adapters. A project's free-form text and
 * link list arrive from a form (in-memory) or a Firestore doc, so both paths
 * trim, drop empties, and clamp length here rather than trusting the caller.
 */

/** Trim, collapse blank to `null`, clamp to `maxLen` characters. */
export function normaliseText(
  value: string | null | undefined,
  maxLen: number,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

/**
 * Keep only well-formed `{ label, url }` entries: a non-empty label and a URL
 * that parses. A malformed row is dropped, never fatal. Caps the list at 40.
 */
export function sanitizeLinks(input: unknown): ProjectLink[] {
  if (!Array.isArray(input)) return [];
  const out: ProjectLink[] = [];
  for (const raw of input) {
    if (raw == null || typeof raw !== "object") continue;
    const { label, url } = raw as Record<string, unknown>;
    const parsed = projectLinkSchema.safeParse({
      label: typeof label === "string" ? label : "",
      url: typeof url === "string" ? url : "",
    });
    if (parsed.success) out.push(parsed.data);
    if (out.length >= 40) break;
  }
  return out;
}
