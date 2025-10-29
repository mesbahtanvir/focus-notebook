/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // output: 'export', // Temporarily disabled to enable dynamic routes
  // Note: For Capacitor deployment with dynamic routes, you have two options:
  // 1. Use a server (Vercel, etc.) and point Capacitor to the URL
  // 2. Keep static export and use URL parameters instead of path segments (e.g., /tools/goals?id=123)
  trailingSlash: true,
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
