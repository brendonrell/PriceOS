/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // D1 scaffold has no ESLint dep; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
