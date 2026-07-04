import { getCloudflareContext } from '@opennextjs/cloudflare';

/*
 * R2 access for stored Artwork previews (the Cloudflare stand-in for Arweave).
 *
 * OpenNext copies only STRING vars onto process.env — object bindings (R2/KV/D1)
 * are excluded — so the bucket must be reached through the Cloudflare request
 * context, never process.env. Minimal structural types below cover exactly the
 * R2 surface we use, so we need no @cloudflare/workers-types dependency.
 *
 * Bound as PD_ART_PREVIEWS in wrangler.jsonc; activates on the next deploy — no
 * token, no public-bucket flip. Always call getPreviewBucket() INSIDE a request
 * handler (the context is request-scoped).
 */

export interface R2ObjectLike {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2BucketLike {
  head(key: string): Promise<unknown | null>;
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
}

export function getPreviewBucket(): R2BucketLike | null {
  const { env } = getCloudflareContext() as unknown as {
    env: { PD_ART_PREVIEWS?: R2BucketLike };
  };
  return env.PD_ART_PREVIEWS ?? null;
}
