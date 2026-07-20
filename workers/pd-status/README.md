# pd-status — the "is PD down?" page

One dependency-free Worker, fully separate from the main app so it stays up
when the app is what's down. Probes the site, the API, and Supabase live on
every request; serves a status page (+ `/status.json`).

## Go-live (two steps, Brendon's dash)

1. **Deploy once:** from this directory, `npx wrangler deploy` (or create the
   Worker "pd-status" in the Cloudflare dash and paste `worker.js`). It's one
   file, no build.
2. **Domain:** on the deployed Worker → Settings → Domains & Routes → add
   `status.pricediscussion.com` (requires the `pricediscussion.com` zone on
   the account).

When the app's production URL moves off workers.dev, update `APP_URL` at the
top of `worker.js`.
