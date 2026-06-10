/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // D1 scaffold has no ESLint dep; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

// next-pwa removed 2026-06-10 (perf batch). It was already fully disabled
// (`disable: true` since the test phase — SW caches were pinning stale
// bundles), so the wrapper was dead config + a dead dependency. Offline
// support returned 2026-06-10 as a hand-written network-first worker
// (public/sw.js, registered by components/shell/SwRegistrar.tsx) — no
// next-pwa, no config here. SwKiller was removed in the same change.
export default nextConfig;
