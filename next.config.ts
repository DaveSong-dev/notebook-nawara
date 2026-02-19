import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shopping-phinf.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: '*.naver.com',
      },
      {
        protocol: 'http',
        hostname: '*.naver.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['recharts', '@heroicons/react'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
