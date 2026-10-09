const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const CANONICAL_ORIGIN = 'https://www.vetor.blog';
const DEFAULT_HOST = 'www.vetor.blog';
const PING_TIMEOUT_MS = 4_000;

export type IndexNowStatus =
  | 'submitted'
  | 'accepted_pending_validation'
  | 'skipped'
  | 'rejected'
  | 'retryable'
  | 'failed';

export interface IndexNowResult {
  status: IndexNowStatus;
  attempted: number;
  accepted: number;
  httpStatus: number | null;
  source: string;
  reason?: string;
}

function ensureTrailingSlash(url: URL): URL {
  if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
    url.pathname = url.pathname + '/';
  }
  return url;
}

/**
 * Build canonical public URLs for IndexNow. Absolute inputs are allowed, but
 * off-site and non-HTTPS URLs are rejected instead of being rewritten.
 */
export function buildContentUrl(path: string): string {
  const value = path.trim();
  if (!value) throw new Error('IndexNow URL path cannot be empty');

  const url = ensureTrailingSlash(new URL(value, CANONICAL_ORIGIN));
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== DEFAULT_HOST ||
    url.port ||
    url.username ||
    url.password ||
    url.search
  ) {
    throw new Error('IndexNow URLs must be clean canonical HTTPS Vetor URLs without credentials, ports, or query strings');
  }

  url.hash = '';
  return url.toString();
}

/**
 * Return a canonical URL suitable for IndexNow, or null when the input is
 * not a public canonical URL on the configured host.
 */
export function normalizeIndexNowUrl(input: string, expectedHost = DEFAULT_HOST): string | null {
  try {
    const url = new URL(input);
    const host = expectedHost.trim().toLowerCase();

    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== host ||
      url.port ||
      url.username ||
      url.password ||
      url.search
    ) {
      return null;
    }

    url.hash = '';
    return ensureTrailingSlash(url).toString();
  } catch {
    return null;
  }
}

export function classifyIndexNowResponse(httpStatus: number): IndexNowStatus {
  if (httpStatus === 200) return 'submitted';
  if (httpStatus === 202) return 'accepted_pending_validation';
  if (httpStatus === 429 || httpStatus >= 500) return 'retryable';
  if ([400, 403, 422].includes(httpStatus)) return 'rejected';
  return 'failed';
}

/** Canonical review URL plus the public lists changed by the same edit. */
export function buildReviewIndexNowTargets(
  slug: string,
  categories: string | string[] = []
): string[] {
  const safeSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  if (!safeSlug || safeSlug.includes('/') || safeSlug.includes('..')) {
    throw new Error('Invalid review slug for IndexNow');
  }

  const categoryList = Array.isArray(categories) ? categories : [categories];
  const targets = [
    buildContentUrl('/reviews/' + encodeURIComponent(safeSlug) + '/'),
    buildContentUrl('/reviews/'),
    ...categoryList
      .map((category) => category.trim())
      .filter(Boolean)
      .map((category) => buildContentUrl('/reviews/categoria/' + encodeURIComponent(category) + '/')),
  ];

  return Array.from(new Set(targets));
}

export function buildComparativeIndexNowTargets(slug: string): string[] {
  const safeSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  if (!safeSlug || safeSlug.includes('/') || safeSlug.includes('..')) {
    throw new Error('Invalid comparative slug for IndexNow');
  }

  return [
    buildContentUrl('/comparativos/' + encodeURIComponent(safeSlug) + '/'),
    buildContentUrl('/comparativos/'),
  ];
}

export async function pingIndexNow(
  urls: string[],
  source = 'unspecified'
): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_API_KEY || process.env.INDEXNOW_KEY;
  const host = (process.env.INDEXNOW_HOST || DEFAULT_HOST).trim().toLowerCase();

  if (!key) {
    const result: IndexNowResult = {
      status: 'skipped',
      attempted: 0,
      accepted: 0,
      httpStatus: null,
      source,
      reason: 'missing_indexnow_key',
    };
    console.warn('[IndexNow]', JSON.stringify(result));
    return result;
  }

  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)) {
    const result: IndexNowResult = {
      status: 'skipped',
      attempted: 0,
      accepted: 0,
      httpStatus: null,
      source,
      reason: 'invalid_indexnow_host',
    };
    console.error('[IndexNow]', JSON.stringify(result));
    return result;
  }

  const normalized = urls
    .map((url) => normalizeIndexNowUrl(url, host))
    .filter((url): url is string => Boolean(url));
  const targets = Array.from(new Set(normalized));

  if (!targets.length) {
    const result: IndexNowResult = {
      status: 'skipped',
      attempted: 0,
      accepted: 0,
      httpStatus: null,
      source,
      reason: 'no_valid_canonical_urls',
    };
    console.warn('[IndexNow]', JSON.stringify({ ...result, inputCount: urls.length }));
    return result;
  }

  const keyLocation = 'https://' + host + '/' + key + '.txt';

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList: targets }),
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      cache: 'no-store',
    });

    const status = classifyIndexNowResponse(response.status);
    const result: IndexNowResult = {
      status,
      attempted: targets.length,
      accepted: response.status === 200 || response.status === 202 ? targets.length : 0,
      httpStatus: response.status,
      source,
      ...(status === 'accepted_pending_validation'
        ? { reason: 'key_validation_pending_not_confirmed' }
        : status === 'retryable'
          ? { reason: 'temporary_indexnow_failure' }
          : status === 'rejected'
            ? { reason: 'indexnow_rejected_request_check_key_host_and_urls' }
            : status === 'failed'
              ? { reason: 'unexpected_indexnow_response' }
              : {}),
    };

    const log = status === 'submitted'
      ? console.info
      : status === 'accepted_pending_validation'
        ? console.warn
        : console.error;
    log('[IndexNow]', JSON.stringify(result));
    return result;
  } catch (error) {
    const result: IndexNowResult = {
      status: 'retryable',
      attempted: targets.length,
      accepted: 0,
      httpStatus: null,
      source,
      reason: error instanceof Error ? error.name : 'network_error',
    };
    console.error('[IndexNow]', JSON.stringify(result));
    return result;
  }
}

export async function pingNewContent(
  urls: string[],
  source = 'content-published'
): Promise<IndexNowResult> {
  return pingIndexNow(urls, source);
}
