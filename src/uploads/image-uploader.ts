/**
 * The one seam for turning a pasted image into a hosted URL. Deliberately tiny —
 * a single method — so the rest of the app never learns where images go. Two
 * adapters satisfy it: `WorkerImageUploader` (POSTs to the Cloudflare Worker that
 * proxies imgbb) and `FakeImageUploader` (tests, Storybook, the offline `memory`
 * demo). The image bytes never touch Firebase; only the returned URL is stored.
 */
export interface ImageUploader {
  /**
   * Upload one image and resolve to its hosted URL. Rejects with an `Error`
   * whose message is safe to show the user. Honours `signal` for cancellation.
   */
  upload(file: Blob, signal?: AbortSignal): Promise<string>;
}
