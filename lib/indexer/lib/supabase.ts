import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role: bypasses RLS. NEVER ship this key to a browser or
// expose it from a Next.js route that returns it to the client.
//
// Created LAZILY on first use — the env check must not run at import time,
// because Next's build-time page-data collection imports every route module
// in an env without secrets (the standalone indexer repo never hit this;
// inside PriceOS it broke the build). Matches the config.ts contract:
// secrets are validated in the code path that actually needs them.
let client: SupabaseClient | null = null;

export function getIndexerSupabase(): SupabaseClient {
  if (client) return client;
  // Inside PriceOS the URL lives under the app's public env name — accept
  // both (the standalone indexer repo used SUPABASE_URL; Cloudflare sets only
  // NEXT_PUBLIC_SUPABASE_URL, which made every webhook write silently no-op:
  // per-log fault isolation ate the throw and the route still returned 200).
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in indexer env",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return client;
}
