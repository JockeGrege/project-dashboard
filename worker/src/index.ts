/**
 * Image-upload proxy for Hypomone.
 *
 * The browser POSTs a pasted screenshot here as multipart/form-data (field
 * `image`); this Worker forwards it to imgbb with the API key it holds as a
 * secret, so the credential never ships in the app bundle. Only the resulting
 * URL goes back to the browser (and, from there, into Firestore).
 *
 *   POST /            multipart/form-data, field "image"
 *   → 200 { "url": "https://i.ibb.co/XXXX/name.png" }
 *   → 4xx/5xx { "error": "human-readable reason" }
 *
 * Secrets / vars (see wrangler.toml and `wrangler secret put`):
 *   IMGBB_API_KEY   — secret, the imgbb account's API key
 *   ALLOWED_ORIGIN  — var, comma-separated list of allowed browser origins
 */

export interface Env {
  IMGBB_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

// imgbb accepts images up to 32 MB.
const MAX_BYTES = 32 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, cors);
    }
    if (!env.IMGBB_API_KEY) {
      return json({ error: "Server is missing its imgbb credentials." }, 500, cors);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Expected multipart/form-data." }, 400, cors);
    }

    const image = form.get("image");
    if (!(image instanceof File)) {
      return json({ error: "No image in the request." }, 400, cors);
    }
    if (image.size > MAX_BYTES) {
      return json({ error: "Image is over 32 MB." }, 400, cors);
    }
    if (image.type && !image.type.startsWith("image/")) {
      return json({ error: "That file is not an image." }, 400, cors);
    }

    const upstream = new FormData();
    upstream.append("image", image, image.name || "upload.png");

    const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(
      env.IMGBB_API_KEY,
    )}`;

    let imgbbRes: Response;
    try {
      imgbbRes = await fetch(endpoint, { method: "POST", body: upstream });
    } catch {
      return json({ error: "Could not reach imgbb." }, 502, cors);
    }

    const payload = (await imgbbRes.json().catch(() => null)) as
      | {
          success?: boolean;
          data?: { url?: unknown };
          error?: { message?: unknown };
        }
      | null;

    const link = payload?.data?.url;
    if (!imgbbRes.ok || !payload?.success || typeof link !== "string") {
      const detail =
        payload?.error && typeof payload.error.message === "string"
          ? payload.error.message
          : `imgbb rejected the upload (${imgbbRes.status}).`;
      return json({ error: detail }, 502, cors);
    }

    return json({ url: link }, 200, cors);
  },
};

function corsHeaders(request: Request, env: Env): Headers {
  const allowed = (env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get("Origin") ?? "";
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });

  // `ALLOWED_ORIGIN = "*"` opens it to any origin (fine here — the Worker holds
  // nothing but the imgbb key and takes no credentials).
  if (allowed.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
    return headers;
  }

  // Any local dev origin (any port, IPv4 or IPv6) is fine — it can only come from
  // this machine. Otherwise fall back to the explicit allowlist.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(
    origin,
  );
  if (origin && (isLocal || allowed.length === 0 || allowed.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function json(body: unknown, status: number, headers: Headers): Response {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers: h });
}
