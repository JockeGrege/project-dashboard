# hypomone-image-upload

A tiny Cloudflare Worker that stands between the browser and [imgbb](https://imgbb.com).
Hypomone posts a pasted screenshot here; the Worker adds the imgbb **API key**
(kept as a secret, never in the app bundle) and forwards the upload. Only the
resulting URL comes back — the image bytes never touch Firebase.

```
POST /                multipart/form-data, field "image"
→ 200 { "url": "https://i.ibb.co/XXXX/name.png" }
→ 4xx/5xx { "error": "reason" }
```

## Before you start

All free; sign-up links open during the wizard:

- An **imgbb** account — <https://imgbb.com/signup>
- A **Cloudflare** account — the sign-up is on the `wrangler login` page
- Optional: the **GitHub CLI** (`gh`, logged in) so the wizard can set the
  `VITE_IMAGE_UPLOAD_URL` Actions secret for you. Without it you set that one
  secret by hand later — it only affects the deployed site, not local dev.

## First-time setup

The guided path is [`../scripts/setup-image-upload.sh`](../scripts/setup-image-upload.sh),
which walks every step below and fills in `.env` for you. It is idempotent — stop
with Ctrl-C and re-run any time. Manual equivalent:

1. **imgbb API key** — sign in at <https://imgbb.com>, then open
   <https://api.imgbb.com/> and click **Get API key**. Copy the key it shows.
2. **Install + sign in** —
   ```sh
   cd worker
   npm install
   npx wrangler login
   ```
3. **Store the API key as a secret** —
   ```sh
   npx wrangler secret put IMGBB_API_KEY
   ```
4. **Deploy** —
   ```sh
   npx wrangler deploy
   ```
   Note the printed `https://hypomone-image-upload.<subdomain>.workers.dev` URL.
5. **Point the app at it** — put that URL in the repo root `.env` as
   `VITE_IMAGE_UPLOAD_URL=…`, and add it as the GitHub Actions secret
   `VITE_IMAGE_UPLOAD_URL` so production builds pick it up.

## After setup

- **Restart the dev server** (`npm run dev`) — Vite only reads `.env` at startup,
  so a server left running won't have `VITE_IMAGE_UPLOAD_URL` yet.
- **Local dev works immediately** once restarted.
- **The deployed site** picks this up only after the `VITE_IMAGE_UPLOAD_URL`
  Actions secret is set **and** the change is merged to `main` (that's what
  triggers `deploy.yml`).
- **First deploy** may prompt you to choose a `workers.dev` subdomain — one-time.
- Changed `ALLOWED_ORIGIN` in `wrangler.toml`? Re-run `npx wrangler deploy`.

## Config

- `ALLOWED_ORIGIN` (var, in `wrangler.toml`) — comma-separated browser origins
  allowed to call the Worker. Add any new deploy origin here.
- `IMGBB_API_KEY` (secret) — set with `wrangler secret put`, never committed.
- To auto-expire uploads, add `&expiration=<seconds>` (60–15552000) to the imgbb
  endpoint URL in `src/index.ts`.

## Logs

```sh
npx wrangler tail
```

## Troubleshooting

**"Couldn't reach the image server" in the app, but `wrangler tail` shows the
`POST` as `Ok`** — the Worker answered but the browser rejected the response for
CORS. Any `localhost` / `127.0.0.1` origin is allowed automatically; for anything
else (a LAN IP, a preview host, the deployed site on a new domain) add that exact
origin to `ALLOWED_ORIGIN` in `wrangler.toml` and re-run `npx wrangler deploy`.
The browser console names the offending origin.

## Note

imgbb links are effectively public — anyone with the URL can view the image.
Don't paste screenshots with secrets in them.
