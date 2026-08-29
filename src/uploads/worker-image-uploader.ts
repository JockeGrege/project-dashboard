import type { ImageUploader } from "./image-uploader";

/**
 * Talks to the Cloudflare Worker (see `worker/`), which holds the imgbb API key
 * and forwards the upload. Contract:
 *
 *   POST <endpoint>   multipart/form-data, field "image"
 *   → 200 { "url": "https://i.ibb.co/…" }
 *   → 4xx/5xx { "error": "reason" }
 */
export function createWorkerImageUploader(endpoint: string): ImageUploader {
  return {
    async upload(file, signal) {
      const body = new FormData();
      body.append("image", file, fileName(file));

      const init: RequestInit = { method: "POST", body };
      if (signal) init.signal = signal;

      let res: Response;
      try {
        res = await fetch(endpoint, init);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        // A CORS-blocked response and a dead network both land here as a
        // TypeError — the browser won't say which. Log the detail, show a hint.
        console.warn("Image upload fetch failed", err);
        throw new Error("Couldn't reach the image server (offline, or CORS).");
      }

      const data = (await res.json().catch(() => null)) as
        | { url?: unknown; error?: unknown }
        | null;

      if (!res.ok || !data || typeof data.url !== "string") {
        const reason =
          data && typeof data.error === "string"
            ? data.error
            : `Upload failed (${res.status}).`;
        throw new Error(reason);
      }
      return data.url;
    },
  };
}

function fileName(file: Blob): string {
  if (file instanceof File && file.name) return file.name;
  const ext = file.type.split("/")[1] ?? "png";
  return `pasted-image.${ext}`;
}
