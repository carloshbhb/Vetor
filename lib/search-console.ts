import { JWT } from 'google-auth-library';
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, NEXT_PUBLIC_SITE_URL } from '@/lib/env';

const SITE_URL = NEXT_PUBLIC_SITE_URL.startsWith('http') ? NEXT_PUBLIC_SITE_URL : `https://${NEXT_PUBLIC_SITE_URL}`;

const SEARCH_CONSOLE_API = 'https://searchconsole.googleapis.com/webmasters/v3';
const URL_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

function getPrivateKey(): string | null {
  const rawKey = GOOGLE_PRIVATE_KEY;
  if (!rawKey) return null;

  let key = rawKey
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^"/, '').replace(/"$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!key.includes('-----BEGIN')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }

  return key;
}

async function getAccessToken(): Promise<string> {
  const email = GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();

  if (!email || !privateKey) {
    throw new Error('Google credentials not found. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  const jwtClient = new JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/indexing',
    ],
  });

  const token = await jwtClient.authorize();
  return token.access_token || '';
}

// ─── Types ──────────────────────────────────────────────────────────

export interface IndexingStatus {
  url: string;
  verdict: string;
  robotsTxtState: string;
  pageFetchState: string;
  indexingState: string;
  lastCrawlTime?: string;
  pageIndexState?: string;
  referringUrls?: string[];
  crawledAs?: string;
  verdicts?: {
    verdict: string;
    coverageState?: string;
    reason?: string;
    details?: string;
  }[];
}

export interface SearchConsolePage {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SitemapEntry {
  path: string;
  status: string;
  isActive: boolean;
  type: string;
  dateSubmitted: string;
  datePublished: string;
}

// ─── URL Inspection ─────────────────────────────────────────────────

export async function inspectUrl(url: string): Promise<IndexingStatus> {
  const accessToken = await getAccessToken();

  const response = await fetch(URL_INSPECTION_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      inspectionUrl: url,
      siteUrl: SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`URL Inspection failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  const result = data.inspectionResult;
  const indexStatusResult = result?.indexStatusResult || {};

  return {
    url,
    verdict: indexStatusResult.verdict || 'UNKNOWN',
    robotsTxtState: indexStatusResult.robotsTxtState || 'UNKNOWN',
    pageFetchState: indexStatusResult.pageFetchState || 'UNKNOWN',
    indexingState: indexStatusResult.indexingState || 'UNKNOWN',
    lastCrawlTime: indexStatusResult.lastCrawlTime,
    pageIndexState: indexStatusResult.pageIndexState,
    referringUrls: indexStatusResult.referringUrls,
    crawledAs: indexStatusResult.crawledAs,
    verdicts: indexStatusResult.verdicts,
  };
}

// ─── Search Analytics ───────────────────────────────────────────────

export async function querySearchAnalytics(
  startDate: string,
  endDate: string,
  dimensions: string[] = ['page'],
  rowLimit: number = 25000
): Promise<SearchConsolePage[]> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: 'final',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Search Analytics query failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  return (data.rows || []).map((row: any) => ({
    url: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// ─── Sitemaps ───────────────────────────────────────────────────────

export async function listSitemaps(): Promise<SitemapEntry[]> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(SITE_URL)}/sitemaps`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`List sitemaps failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data.sitemapEntry || [];
}

// ─── Submit Sitemap to GSC ──────────────────────────────────────────

export async function submitSitemap(sitemapPath: string = 'sitemap.xml'): Promise<{ success: boolean; message: string }> {
  const accessToken = await getAccessToken();

  // Use PUT to submit (create or update) the sitemap
  const response = await fetch(
    `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(sitemapPath)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        path: sitemapPath,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return { success: false, message: data.error?.message || JSON.stringify(data) };
  }

  return { success: true, message: `Sitemap ${sitemapPath} submitted successfully` };
}

// ─── Ping All Sitemaps ──────────────────────────────────────────────

export async function pingAllSitemaps(): Promise<{ submitted: number; errors: number }> {
  const submitted = await submitSitemap('sitemap.xml');
  let errors = submitted.success ? 0 : 1;
  return { submitted: submitted.success ? 1 : 0, errors };
}

// ─── Get Site Info ──────────────────────────────────────────────────

export async function getSiteInfo(): Promise<any> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(SITE_URL)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Get site info failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}
