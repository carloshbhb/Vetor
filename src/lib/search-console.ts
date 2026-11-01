import crypto from "node:crypto";

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchConsoleResponse = { rows?: SearchConsoleRow[]; responseAggregationType?: string };

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function getServiceAccountEmail(): string | undefined {
  return process.env.GSC_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
}

function describeGoogleOAuthError(status: number, raw: string): string {
  let code = "";
  let description = "";
  try {
    const payload = JSON.parse(raw) as {
      error?: string | { status?: string; message?: string };
      error_description?: string;
    };
    code = typeof payload.error === "string"
      ? payload.error
      : typeof payload.error?.status === "string"
        ? payload.error.status
        : "";
    description = payload.error_description ||
      (typeof payload.error === "object" ? payload.error.message || "" : "");
  } catch {
    description = raw;
  }

  const detail = [code, description]
    .filter(Boolean)
    .join(": ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 180);

  return `OAuth Google respondeu HTTP ${status}${detail ? `: ${detail}` : ""}.`;
}

async function getAccessToken(): Promise<{ token: string | null; error?: string }> {
  const email = getServiceAccountEmail();
  const privateKey = (process.env.GSC_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    return { token: null, error: "Credenciais do service account ausentes no ambiente Production." };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    return { token: null, error: describeGoogleOAuthError(response.status, raw) };
  }
  const data = (await response.json()) as { access_token?: string };
  return data.access_token
    ? { token: data.access_token }
    : { token: null, error: "OAuth Google respondeu sem access_token." };
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number): string {
  return formatDate(shiftDate(new Date(), -days));
}

async function querySearchConsole(siteUrl: string, token: string, startDate: string, endDate: string,
  dimensions: Array<"query" | "page"> | null = ["query", "page"], rowLimit = 5000
): Promise<{ rows: SearchConsoleRow[]; error?: string; aggregationType?: string }> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = { startDate, endDate, rowLimit, dataState: "final", type: "web",
    ...(dimensions?.length ? { dimensions } : {}) };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    return { rows: [], error: `Search Console respondeu ${response.status}: ${message.slice(0, 180)}` };
  }
  const data = (await response.json()) as SearchConsoleResponse;
  return { rows: data.rows || [], aggregationType: data.responseAggregationType };
}

export function resolveSearchConsoleMetrics(aggregate: SearchConsoleRow | null | undefined,
  pageRows: SearchConsoleRow[], queryPageRows: SearchConsoleRow[]) {
  const sum = (rows: SearchConsoleRow[], field: "clicks" | "impressions") =>
    rows.reduce((total, row) => total + (Number.isFinite(row[field]) ? Number(row[field]) : 0), 0);
  const fallbackRows = pageRows.length ? pageRows : queryPageRows;
  const fallbackImpressions = sum(fallbackRows, "impressions");
  const fallbackClicks = sum(fallbackRows, "clicks");
  const weightedPosition = fallbackRows.reduce(
    (total, row) => total + (Number(row.position) || 0) * (Number(row.impressions) || 0), 0);
  const hasAggregate = Boolean(aggregate && Number.isFinite(aggregate.impressions) && Number.isFinite(aggregate.clicks));
  const totalImpressions = hasAggregate ? Number(aggregate!.impressions) : fallbackImpressions;
  const totalClicks = hasAggregate ? Number(aggregate!.clicks) : fallbackClicks;
  const averagePosition = hasAggregate && Number.isFinite(aggregate!.position)
    ? Number(aggregate!.position) : fallbackImpressions > 0 ? weightedPosition / fallbackImpressions : 0;
  const queryVisibleImpressions = sum(queryPageRows, "impressions");
  const queryVisibleClicks = sum(queryPageRows, "clicks");
  return {
    totalClicks: Math.round(totalClicks), totalImpressions: Math.round(totalImpressions),
    averageCtr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    averagePosition: Number(averagePosition.toFixed(1)),
    queryVisibleClicks: Math.round(queryVisibleClicks), queryVisibleImpressions: Math.round(queryVisibleImpressions),
    unlistedClicks: Math.max(0, Math.round(totalClicks - queryVisibleClicks)),
    unlistedImpressions: Math.max(0, Math.round(totalImpressions - queryVisibleImpressions)),
    totalsSource: hasAggregate ? "property_aggregate" as const : pageRows.length ? "page_rows_fallback" as const : "query_page_fallback" as const,
  };
}

export async function fetchSearchConsoleRowsForRange(startDate: string, endDate: string,
  options: { includeAggregates?: boolean } = {}
): Promise<{
  configured: boolean; rows: SearchConsoleRow[]; pageRows: SearchConsoleRow[];
  totals: SearchConsoleRow | null; pageRowsError?: string; totalsError?: string;
  startDate: string; endDate: string; error?: string;
}> {
  const siteUrl = process.env.GSC_SITE_URL;
  const email = getServiceAccountEmail();
  const configured = Boolean(siteUrl && email && (process.env.GSC_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY));
  if (!configured) return { configured: false, rows: [], pageRows: [], totals: null, startDate, endDate };
  try {
    const auth = await getAccessToken();
    if (!auth.token) return { configured: true, rows: [], pageRows: [], totals: null, startDate, endDate,
      error: auth.error || "Não foi possível obter o token do Google." };
    const result = await querySearchConsole(siteUrl!, auth.token, startDate, endDate);
    if (result.error || options.includeAggregates === false) return {
      configured: true, rows: result.rows, pageRows: [], totals: null, startDate, endDate,
      ...(result.error ? { error: result.error } : {}),
    };
    const [pages, aggregate] = await Promise.all([
      querySearchConsole(siteUrl!, auth.token, startDate, endDate, ["page"], 5000),
      querySearchConsole(siteUrl!, auth.token, startDate, endDate, null, 1),
    ]);
    return {
      configured: true, rows: result.rows, pageRows: pages.rows, totals: aggregate.rows[0] || null, startDate, endDate,
      ...(pages.error ? { pageRowsError: pages.error } : {}),
      ...(aggregate.error ? { totalsError: aggregate.error } : {}),
    };
  } catch (error) {
    return { configured: true, rows: [], pageRows: [], totals: null, startDate, endDate,
      error: error instanceof Error ? error.message : "Erro desconhecido no Search Console." };
  }
}

export async function fetchSearchConsoleRows(): Promise<{
  configured: boolean; rows: SearchConsoleRow[]; pageRows: SearchConsoleRow[];
  totals: SearchConsoleRow | null; pageRowsError?: string; totalsError?: string;
  startDate: string; endDate: string; error?: string; fallbackUsed?: boolean;
}> {
  const endDate = dateDaysAgo(2);
  const recent = await fetchSearchConsoleRowsForRange(dateDaysAgo(29), endDate);
  const metrics = resolveSearchConsoleMetrics(recent.totals, recent.pageRows, recent.rows);
  const recentHasData = recent.rows.length > 0 || recent.pageRows.length > 0 ||
    metrics.totalImpressions > 0 || metrics.totalClicks > 0;
  if (!recent.configured || recent.error || recentHasData) return recent;
  const extended = await fetchSearchConsoleRowsForRange(dateDaysAgo(90), endDate);
  return { ...extended, fallbackUsed: true };
}
