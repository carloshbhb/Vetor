import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
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
    },
  });
}