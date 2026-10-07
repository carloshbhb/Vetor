import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images3.kabum.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.tupi.com.py',
      },
      {
        protocol: 'https',
        hostname: 'www.tmt.my',
      },
      {
        protocol: 'https',
        hostname: 'images.tcdn.com.br',
      },
      {
        protocol: 'https',
        hostname: 'xiaomistoreph.com',
      },
      {
        protocol: 'https',
        hostname: 'bfasset.costco-static.com',
      },
      {
        protocol: 'https',
        hostname: 'resources.claroshop.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/metodologia',
        destination: '/como-avaliamos/',
        permanent: true,
      },
      {
        source: '/sitemap',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/sitemap/',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/rss.xml',
        destination: '/feed.xml',
        permanent: true,
      },
      {
        source: '/review/echo-dot-5',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/echo-dot-5/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/amazon-echo-dot-5-geracao',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/amazon-echo-dot-5-geracao/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/echo-dot-5-alexa-completo',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/echo-dot-5-alexa-completo/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/review/focusrite-scarlett-2i2-4-geracao',
        destination: '/reviews/focusrite-scarlett-2i2-4th-gen-analise/',
        permanent: true,
      },
      {
        source: '/review/focusrite-scarlett-2i2-4-geracao/',
        destination: '/reviews/focusrite-scarlett-2i2-4th-gen-analise/',
        permanent: true,
      },
      {
        source: '/reviews/echo-dot-5',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/echo-dot-5/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/amazon-echo-dot-5-geracao',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/amazon-echo-dot-5-geracao/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/echo-dot-5-alexa-completo',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/echo-dot-5-alexa-completo/',
        destination: '/reviews/echo-dot-5-geracao/',
        permanent: true,
      },
      {
        source: '/reviews/focusrite-scarlett-2i2-4-geracao',
        destination: '/reviews/focusrite-scarlett-2i2-4th-gen-analise/',
        permanent: true,
      },
      {
        source: '/reviews/focusrite-scarlett-2i2-4-geracao/',
        destination: '/reviews/focusrite-scarlett-2i2-4th-gen-analise/',
        permanent: true,
      },
      {
        source: '/review/:slug',
        destination: '/reviews/:slug/',
        permanent: true,
      },
      {
        source: '/categoria/:category/',
        destination: '/reviews/categoria/:category/',
        permanent: true,
      },
      {
        source: '/reviews/20-mais-vendidor-669r-4965225-offfrete-grtis-micro-ondas-mondial-21l-1200w-mo-01-21-e-espelhado',
        destination: '/reviews/',
        permanent: true,
      },
      {
        source: '/reviews/8-mais-vendidor-299r-15647-offfrete-grtis-parafusadeira-e-furadeira-impacto-the-black-tools-tb-',
        destination: '/reviews/',
        permanent: true,
      },
      {
        source: '/reviews/airpods-pro-2',
        destination: '/reviews/airpods-pro-2-review-2026/',
        permanent: true,
      },
      {
        source: '/reviews/redmi-watch-5',
        destination: '/reviews/xiaomi-redmi-watch-5/',
        permanent: true,
      },
      {
        source: '/reviews/sony-wf-1000xm5',
        destination: '/reviews/sony-wf-1000xm5-fone-anc-premium/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
