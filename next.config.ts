import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
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
