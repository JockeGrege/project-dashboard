export interface Page<T> {
  /** The items on the requested page. */
  slice: T[];
  /** Always at least 1, even when there are no items. */
  pageCount: number;
  /** The requested page, clamped into `[1, pageCount]` so callers can self-correct. */
  page: number;
}

/**
 * Slice a list for the flat-view grid pager. One-indexed. Out-of-range pages
 * clamp rather than returning empty, so a stale page number (e.g. after items
 * are removed) still shows something.
 */
export function paginate<T>(
  items: readonly T[],
  perPage: number,
  page: number,
): Page<T> {
  const size = Math.max(1, Math.floor(perPage));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const clamped = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (clamped - 1) * size;
  return {
    slice: items.slice(start, start + size),
    pageCount,
    page: clamped,
  };
}
