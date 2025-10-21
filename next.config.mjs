/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export', // ✅ enables static build in /out folder
  images: {
    unoptimized: true, // ✅ prevents image optimizer errors in static mode
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
