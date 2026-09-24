import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'www.vetor.blog',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/review/:slug',
        destination: '/reviews/:slug',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
