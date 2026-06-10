/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // D1 scaffold has no ESLint dep; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

// next-pwa removed 2026-06-10 (perf batch). It was already fully disabled
// (`disable: true` since the test phase — SW caches were pinning stale
// bundles), so the wrapper was dead config + a dead dependency. SwKiller
// (components/shell/SwKiller.tsx) still tears down any service workers
// installed by older builds. If offline/PWA caching is ever re-scoped,
// reintroduce deliberately with a fresh runtimeCaching design.
export default nextConfig;
