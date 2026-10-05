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
    ],
  },
  async redirects() {
    return [
      {
        source: '/metodologia',
        destination: '/como-avaliamos/',
        permanent: true,
      },
      // P0 SEO: consolidar aliases antigos que ainda recebem impressões.
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
      // P0 SEO: recuperar hubs legados de categoria que ainda recebem impressões.
      {
        source: '/categoria/:category/',
        destination: '/reviews/categoria/:category/',
        permanent: true,
      },
      // P0-10: reviews-spam de scraping (title-lixo) → índice de categorias
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
      // P1-8: drafts finos do MESMO produto de review publicada → canibalização evitada
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
