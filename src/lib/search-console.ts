import crypto from "node:crypto";

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchConsoleResponse = { rows?: SearchConsoleRow[] };

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) return null;

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

  if (!response.ok) return null;
  const data = (await response.json()) as { access_token?: string };
  return data.access_token || null;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function fetchSearchConsoleRows(): Promise<{
  configured: boolean;
  rows: SearchConsoleRow[];
  startDate: string;
  endDate: string;
  error?: string;
}> {
  const siteUrl = process.env.GSC_SITE_URL;
  const configured = Boolean(siteUrl && process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
  const endDate = dateDaysAgo(2);
  const startDate = dateDaysAgo(29);

  if (!configured) {
    return { configured: false, rows: [], startDate, endDate };
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return { configured: true, rows: [], startDate, endDate, error: "Não foi possível obter o token do Google." };
    }

    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl!)}/searchAnalytics/query`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query", "page"],
        rowLimit: 1000,
        dataState: "final",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return {
        configured: true,
        rows: [],
        startDate,
        endDate,
        error: `Search Console respondeu ${response.status}: ${message.slice(0, 180)}`,
      };
    }

    const data = (await response.json()) as SearchConsoleResponse;
    return { configured: true, rows: data.rows || [], startDate, endDate };
  } catch (error) {
    return {
      configured: true,
      rows: [],
      startDate,
      endDate,
      error: error instanceof Error ? error.message : "Erro desconhecido no Search Console.",
    };
  }
}
