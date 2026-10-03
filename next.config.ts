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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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
      // P0-10: reviews-spam de scraping (title-lixo) → índice de categorias
      {
        source: '/reviews/20-mais-vendidor-669r-4965225-offfrete-grtis-micro-ondas-mondial-21l-1200w-mo-01-21-e-espelhado',
        destination: '/reviews/categoria',
        permanent: true,
      },
      {
        source: '/reviews/8-mais-vendidor-299r-15647-offfrete-grtis-parafusadeira-e-furadeira-impacto-the-black-tools-tb-',
        destination: '/reviews/categoria',
        permanent: true,
      },
      // P1-8: drafts finos do MESMO produto de review publicada → canibalização evitada
      {
        source: '/reviews/airpods-pro-2',
        destination: '/reviews/airpods-pro-2-review-2026',
        permanent: true,
      },
      {
        source: '/reviews/redmi-watch-5',
        destination: '/reviews/xiaomi-redmi-watch-5',
        permanent: true,
      },
      {
        source: '/reviews/sony-wf-1000xm5',
        destination: '/reviews/sony-wf-1000xm5-fone-anc-premium',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
