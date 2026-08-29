import {
  createFakeImageUploader,
  createWorkerImageUploader,
  type ImageUploader,
} from "@/uploads";

/**
 * Picks the image-upload adapter from `VITE_IMAGE_UPLOAD_URL`:
 *
 *  - set   — `WorkerImageUploader` POSTing to the Cloudflare Worker (see `worker/`
 *            and `scripts/setup-image-upload.sh`).
 *  - unset — `FakeImageUploader`: pasted images preview from a local object URL
 *            and nothing leaves the browser. This is the `memory`-mode default;
 *            it also keeps a misconfigured deploy from hard-failing the composer.
 */
export function createAppUploader(): ImageUploader {
  let endpoint = import.meta.env.VITE_IMAGE_UPLOAD_URL?.trim();

  if (endpoint) {
    // An http:// endpoint 301s to https:// on Cloudflare, and a cross-origin
    // fetch can't follow a redirect that carries no CORS headers — it just fails
    // opaquely. Upgrade it here so a stray missing "s" isn't a silent outage.
    if (endpoint.startsWith("http://")) {
      console.warn("VITE_IMAGE_UPLOAD_URL is http://; upgrading to https://.");
      endpoint = `https://${endpoint.slice("http://".length)}`;
    }
    return createWorkerImageUploader(endpoint);
  }

  if (import.meta.env.PROD) {
    console.warn(
      "VITE_IMAGE_UPLOAD_URL is not set — pasted images will not be uploaded.",
    );
  }
  return createFakeImageUploader();
}
