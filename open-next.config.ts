import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext Cloudflare config. Step 2 of the migration will wire the
// real seams (incremental cache, etc.); this baseline is enough to produce the
// packed Worker so we can measure its gzipped size against the 3 MB free-plan
// cap.
export default defineCloudflareConfig({});
