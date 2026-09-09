import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Yandex
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: CCBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: meta-externalagent
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

Sitemap: ${baseUrl}/sitemap.xml

Host: ${baseUrl}
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
