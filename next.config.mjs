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
  },
};

export default nextConfig;
