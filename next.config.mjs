/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // D1 scaffold has no ESLint dep; don't block builds on it.
    ignoreDuringBuilds: true,
  },
  // Artwork previews: draw the STORED PNG everywhere (cards, grids, thumbnails)
  // instead of the live engine, except the Output feature page. Same-origin
  // /preview is served by our own worker from the R2 binding — no public bucket,
  // and it works on every origin (dev preview + prod). Empty would fall back to
  // live. (/art is the Artwork page namespace, so previews live under /preview.)
  env: {
    NEXT_PUBLIC_ART_IMAGE_BASE: '/preview',
  },
  // Client-side navigation cache. Next 15 changed the `dynamic` stale-time
  // default from 30s to 0s, which would refetch already-visited pages on every
  // revisit and make navigation feel a beat slower. Re-pinned to the Next 14
  // values (dynamic 30s, static 5min) so client nav stays instant — identical
  // feel to before the upgrade.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // Security headers applied to every response. Deliberately does NOT set a
  // script-src Content-Security-Policy — a blocking script CSP needs tuning
  // against the live wallet/3rd-party scripts or it breaks the app, so that's a
  // separate task. These are the safe, non-breaking baseline: clickjacking
  // protection (frame-ancestors 'self' / X-Frame-Options), MIME-sniff guard,
  // HSTS, a tight referrer policy, and a locked-down permissions policy.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // REPORT-ONLY script CSP (2026-07-13, hardening item 16): blocks
          // nothing, but every would-be violation posts to /api/telemetry —
          // this is the tuning data the future BLOCKING script-src policy
          // needs (wallet/3rd-party script origins). Promote to a blocking
          // Content-Security-Policy only after the reports run quiet.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "script-src 'self' 'unsafe-inline'; report-uri /api/telemetry",
          },
        ],
      },
    ];
  },
};

// next-pwa removed 2026-06-10 (perf batch). It was already fully disabled
// (`disable: true` since the test phase — SW caches were pinning stale
// bundles), so the wrapper was dead config + a dead dependency. Offline
// support returned 2026-06-10 as a hand-written network-first worker
// (public/sw.js, registered by components/shell/SwRegistrar.tsx) — no
// next-pwa, no config here. SwKiller was removed in the same change.
export default nextConfig;
