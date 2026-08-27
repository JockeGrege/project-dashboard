/**
 * The 1–2 character monogram shown on a project card. Derived from the name at
 * render time and never stored (uploaded avatars would need Cloud Storage, which
 * is Blaze-only).
 *
 * Multi-word names take the initial of each of the first two words; single-word
 * names take the first two letters. Non-alphanumeric leading characters are
 * skipped. An empty or symbol-only name falls back to "?".
 */
export function monogram(name: string): string {
  const words = name
    .split(/[\s._/-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  const first = words[0];
  if (first === undefined) return "?";

  const second = words[1];
  if (second === undefined) {
    return [...first].slice(0, 2).join("").toUpperCase();
  }

  return ((first[0] ?? "") + (second[0] ?? "")).toUpperCase();
}
