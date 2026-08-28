/**
 * Split a plain string into text and link runs so a renderer can turn bare URLs
 * into anchors without `dangerouslySetInnerHTML`. Pure and synchronous — the
 * caller owns how a `link` segment is presented.
 */

export interface LinkSegment {
  readonly kind: "text" | "link";
  readonly value: string;
  /** For `link` segments: the href, with a scheme guaranteed. */
  readonly href?: string;
}

// http(s) or www. runs; trailing sentence punctuation is peeled off afterwards.
const URL_RE = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const TRAILING_RE = /[.,;:!?'"]+$/;

/** Peel trailing punctuation, but keep a ")" that closes a "(" inside the URL. */
function splitTrailing(raw: string): [url: string, trailer: string] {
  let url = raw;
  let trailer = "";

  // Unbalanced closing parens first: "(en.wikipedia.org/wiki/Foo_(bar))" keeps
  // one ")", "see (https://x.com)" drops it.
  while (url.endsWith(")")) {
    const opens = (url.match(/\(/g) ?? []).length;
    const closes = (url.match(/\)/g) ?? []).length;
    if (closes <= opens) break;
    trailer = ")" + trailer;
    url = url.slice(0, -1);
  }

  const m = TRAILING_RE.exec(url);
  if (m) {
    trailer = m[0] + trailer;
    url = url.slice(0, -m[0].length);
  }
  return [url, trailer];
}

export function linkify(input: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const [url, trailer] = splitTrailing(match[0]);
    if (url.length === 0) continue;

    if (start > lastIndex) {
      segments.push({ kind: "text", value: input.slice(lastIndex, start) });
    }
    segments.push({
      kind: "link",
      value: url,
      href: url.toLowerCase().startsWith("www.") ? `https://${url}` : url,
    });
    if (trailer) segments.push({ kind: "text", value: trailer });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ kind: "text", value: input.slice(lastIndex) });
  }
  return segments;
}

/** True when the string contains at least one linkable URL. */
export function hasLink(input: string): boolean {
  URL_RE.lastIndex = 0;
  return URL_RE.test(input);
}
