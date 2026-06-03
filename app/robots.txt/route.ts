import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}