/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // D1 scaffold has no ESLint dep; don't block builds on it.
    ignoreDuringBuilds: true,
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
