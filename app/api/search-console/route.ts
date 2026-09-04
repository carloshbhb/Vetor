import { NextRequest, NextResponse } from 'next/server';
import { submitSitemap, listSitemaps, getSiteInfo, inspectUrl } from '@/lib/search-console';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  const url = req.nextUrl.searchParams.get('url');

  try {
    switch (action) {
      case 'submit-sitemap': {
        const result = await submitSitemap('sitemap.xml');
        return NextResponse.json(result);
      }
      case 'list-sitemaps': {
        const sitemaps = await listSitemaps();
        return NextResponse.json({ sitemaps });
      }
      case 'site-info': {
        const info = await getSiteInfo();
        return NextResponse.json(info);
      }
      case 'inspect': {
        if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
        const inspection = await inspectUrl(url);
        return NextResponse.json(inspection);
      }
      case 'status': {
        const [sitemaps, info] = await Promise.all([
          listSitemaps().catch(() => []),
          getSiteInfo().catch(() => null),
        ]);
        return NextResponse.json({ sitemaps, siteInfo: info });
      }
      default: {
        return NextResponse.json({
          usage: {
            'GET /api/search-console?action=submit-sitemap': 'Submit sitemap to GSC',
            'GET /api/search-console?action=list-sitemaps': 'List registered sitemaps',
            'GET /api/search-console?action=site-info': 'Get site registration info',
            'GET /api/search-console?action=inspect&url=/path': 'Inspect a URL',
            'GET /api/search-console?action=status': 'Full status overview',
          }
        });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, url, sitemapPath } = body;

    switch (action) {
      case 'submit-sitemap': {
        const path = sitemapPath || 'sitemap.xml';
        const result = await submitSitemap(path);
        return NextResponse.json(result);
      }
      case 'inspect': {
        if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
        const inspection = await inspectUrl(url);
        return NextResponse.json(inspection);
      }
      default: {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
