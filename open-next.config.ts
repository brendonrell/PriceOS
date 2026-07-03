import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

// Cloudflare seams for the Next app:
//  • incrementalCache → Workers KV (binding NEXT_INC_CACHE_KV in
//    wrangler.jsonc). This carries Next's data/route cache, so the
//    timed-cache API routes (stats 60s / price 10s / search 60s / gas 12s)
//    keep the same revalidate behaviour they had on Vercel instead of
//    recomputing on every request.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
