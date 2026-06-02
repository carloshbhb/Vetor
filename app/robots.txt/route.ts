import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';

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