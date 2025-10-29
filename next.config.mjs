/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export', // Required for static export to Capacitor
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
