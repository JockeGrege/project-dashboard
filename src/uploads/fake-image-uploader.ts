import type { ImageUploader } from "./image-uploader";

export interface FakeImageUploaderOptions {
  /** Resolve after this many ms (default 400). Lets a test observe the pending state. */
  delayMs?: number;
  /** Reject every upload with this message. */
  fail?: string;
  /** Reject only the first upload, then behave normally. Drives the retry path. */
  failOnce?: string;
}

/**
 * No network. Resolves to a deterministic `https://….invalid/…` URL — it passes
 * the same `http(s)`-only hygiene the real product applies, so a filed issue
 * carries a well-formed (if non-loading) attachment. The live preview in the
 * composer still shows the real pixels from a local object URL; this stand-in is
 * only what gets "stored" in the offline `memory` demo and in tests.
 */
export function createFakeImageUploader(
  options: FakeImageUploaderOptions = {},
): ImageUploader {
  const { delayMs = 400, fail, failOnce } = options;
  let firstDone = false;
  let n = 0;

  return {
    upload(file, signal) {
      return new Promise<string>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          if (fail) {
            reject(new Error(fail));
            return;
          }
          if (failOnce && !firstDone) {
            firstDone = true;
            reject(new Error(failOnce));
            return;
          }
          firstDone = true;
          const ext = (file.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
          resolve(`https://images.invalid/fake-${Date.now()}-${++n}.${ext}`);
        }, delayMs);

        function onAbort() {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
  };
}
