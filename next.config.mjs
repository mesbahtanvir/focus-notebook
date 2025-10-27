/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // output: 'export', // Temporarily disabled for build
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      'zustand',
      'react-hook-form',
      'framer-motion',
    ],
    // Enable View Transitions API for native-like page transitions
    // This provides smooth, app-like transitions between routes in supporting browsers
    viewTransitions: true,
  },
};

export default nextConfig;
