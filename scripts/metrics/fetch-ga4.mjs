import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const SCHEMA_VERSION = 1;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANALYTICS_URL = 'https://analyticsdata.googleapis.com/v1beta';
const ORGANIC_FILTER = {
  fieldName: 'sessionDefaultChannelGroup',
  stringFilter: { matchType: 'EXACT', value: 'Organic' },
};
const HISTORY_RETENTION_DAYS = 90;
const SERIES_DAYS = 56;
const MAX_DATA_AGE_DAYS = 2;

export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function round4(value) {
  return Math.round(value * 10000) / 10000;
}

export function loadServiceAccount(env = process.env) {
  const raw = env.GA4_SERVICE_ACCOUNT_JSON
    || (env.GA4_SERVICE_ACCOUNT_FILE ? fs.readFileSync(env.GA4_SERVICE_ACCOUNT_FILE, 'utf8') : null);
  if (!raw) {
    throw new Error('Credenciais ausentes: defina GA4_SERVICE_ACCOUNT_JSON ou GA4_SERVICE_ACCOUNT_FILE');
  }
  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Service account inválida: faltam client_email ou private_key');
  }
  return sa;
}

export function buildServiceAccountJwt(sa, nowSec = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key).toString('base64url');
  return `${unsigned}.${signature}`;
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

export async function getAccessToken(sa, fetchImpl = fetch) {
  const assertion = buildServiceAccountJwt(sa);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Falha na troca de token (${res.status}): ${text}`);
  }
  const data = JSON.parse(text);
  if (!data.access_token) {
    throw new Error(`Resposta sem access_token: ${text}`);
  }
  return data.access_token;
}

export async function runReport(options, fetchImpl = fetch) {
  const {
    token, property, startDate, endDate, dimensions = [], metrics, dimensionFilter,
  } = options;
  const propertyId = String(property).replace(/^properties\//, '');
  const payload = {
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
  };
  if (dimensionFilter) payload.dimensionFilter = { filter: dimensionFilter };
  const res = await fetchImpl(`${ANALYTICS_URL}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GA4 runReport HTTP ${res.status}: ${text}`);
  }
  const json = JSON.parse(text);
  if (json.error) {
    throw new Error(`GA4 runReport erro: ${JSON.stringify(json.error)}`);
  }
  return json;
}

export function reportRows(report) {
  return (report.rows || []).map((row) => ({
    dimensions: row.dimensionValues.map((cell) => cell.value),
    metrics: row.metricValues.map((cell) => Number(cell.value)),
  }));
}

export function fillSeries(rows, startDate, endDate) {
  const byDate = new Map();
  for (const row of rows) {
    byDate.set(row.dimensions[0], row.metrics);
  }
  const series = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const metrics = byDate.get(date);
    series.push({
      date,
      sessions: metrics ? metrics[0] : 0,
      newUsers: metrics ? metrics[1] : 0,
    });
  }
  return series;
}

function delta(cur, prev) {
  if (prev <= 0) return null;
  return round4((cur - prev) / prev);
}

function sumRange(series, from, to) {
  return series
    .filter((row) => row.date >= from && row.date <= to)
    .reduce((total, row) => total + row.sessions, 0);
}

export function computeOrganicStats(series) {
  const end = series.length ? series[series.length - 1].date : null;
  if (!end) throw new Error('Série de sessões vazia');

  let effectiveEnd = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].sessions > 0) {
      effectiveEnd = series[i].date;
      break;
    }
  }
  if (!effectiveEnd) {
    throw new Error('GA4 retornou 0 sessões orgânicas no período');
  }

  const ageDays = Math.round(
    (new Date(`${end}T00:00:00Z`) - new Date(`${effectiveEnd}T00:00:00Z`)) / 86400000
  );
  if (ageDays > MAX_DATA_AGE_DAYS) {
    throw new Error(`Dados GA4 desatualizados: última sessão em ${effectiveEnd} (idade ${ageDays}d > ${MAX_DATA_AGE_DAYS}d)`);
  }

  const last7From = addDays(effectiveEnd, -6);
  const prev7From = addDays(effectiveEnd, -13);
  const prev7To = addDays(effectiveEnd, -7);
  const last28From = addDays(effectiveEnd, -27);
  const prev28From = addDays(effectiveEnd, -55);
  const prev28To = addDays(effectiveEnd, -28);

  const sessions7d = sumRange(series, last7From, effectiveEnd);
  const sessionsPrev7d = sumRange(series, prev7From, prev7To);
  const sessions28d = sumRange(series, last28From, effectiveEnd);
  const sessionsPrev28d = sumRange(series, prev28From, prev28To);
  const newUsers7d = series
    .filter((row) => row.date >= last7From && row.date <= effectiveEnd)
    .reduce((total, row) => total + row.newUsers, 0);

  const indexByDate = new Map(series.map((row) => [row.date, row]));
  const lastDay = indexByDate.get(effectiveEnd)?.sessions ?? 0;
  const prevDay = indexByDate.get(addDays(effectiveEnd, -1))?.sessions ?? 0;
  const anomaly = prevDay > 0 && Math.abs(lastDay / prevDay - 1) > 0.5;

  const daily = series
    .filter((row) => row.date <= effectiveEnd)
    .slice(-28)
    .map((row) => ({ date: row.date, sessions: row.sessions }));

  return {
    sessions: sessions7d,
    delta7d: delta(sessions7d, sessionsPrev7d),
    delta28d: delta(sessions28d, sessionsPrev28d),
    newUsers: newUsers7d,
    anomaly,
    daily,
    effectiveEnd,
  };
}

export function computeTopPages(currentRows, previousRows) {
  const previous = new Map(previousRows.map((row) => [row.dimensions[0], row.metrics[0]]));
  const pages = currentRows.map((row) => {
    const path = row.dimensions[0];
    const sessions = row.metrics[0];
    const prev = previous.get(path) ?? 0;
    return { path, sessions, delta7d: delta(sessions, prev) };
  });
  pages.sort((a, b) => b.sessions - a.sessions);
  return pages.slice(0, 20);
}

export function mergeHistory(existingDaily, series, effectiveEnd, retention = HISTORY_RETENTION_DAYS) {
  const byDate = new Map((existingDaily || []).map((entry) => [entry.date, entry.sessions]));
  if (byDate.size === 0) {
    for (const row of series) {
      if (row.date <= effectiveEnd) byDate.set(row.date, row.sessions);
    }
  } else if (!byDate.has(effectiveEnd)) {
    const row = series.find((entry) => entry.date === effectiveEnd);
    if (row) byDate.set(effectiveEnd, row.sessions);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-retention)
    .map(([date, sessions]) => ({ date, sessions }));
}

function formatDelta(value) {
  if (value === null || value === undefined) return 'n/d';
  const pct = `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
  return pct;
}

export function buildSummary(data) {
  const lines = [];
  lines.push('# Métricas GA4 — resumo diário');
  lines.push('');
  lines.push(`- Execução: ${data.date} | dados até ${data.organic.daily.length ? data.organic.daily[data.organic.daily.length - 1].date : 'n/d'} (lag GA4 T-1)`);
  lines.push('## Tendência (sessões orgânicas)');
  lines.push(`- 7d: ${data.organic.sessions} sessões (Δ7d ${formatDelta(data.organic.delta7d)} | Δ28d ${formatDelta(data.organic.delta28d)})`);
  lines.push(`- Novos usuários (7d): ${data.organic.newUsers}`);
  lines.push(`- Anomaly: ${data.anomaly ? 'SIM (delta diário > 50% — investigar, não extrair lição)' : 'não'}`);
  lines.push('## Top 10 páginas (7d)');
  data.topPages.slice(0, 10).forEach((page, i) => {
    lines.push(`${i + 1}. \`${page.path}\` — ${page.sessions} sessões (Δ7d ${formatDelta(page.delta7d)})`);
  });
  if (data.topPages.length === 0) lines.push('- (sem páginas orgânicas no período)');
  const movers = data.topPages
    .filter((page) => page.delta7d !== null)
    .sort((a, b) => a.delta7d - b.delta7d);
  const worst = movers[0];
  const best = movers[movers.length - 1];
  lines.push('## Maiores variações da semana');
  lines.push(`- Maior queda: ${worst ? `\`${worst.path}\` ${formatDelta(worst.delta7d)}` : 'n/d'}`);
  lines.push(`- Maior subida: ${best ? `\`${best.path}\` ${formatDelta(best.delta7d)}` : 'n/d'}`);
  lines.push('## Perguntas em aberto');
  if (data.organic.delta28d !== null && data.organic.delta28d < -0.1) {
    lines.push(`- Tendência 28d negativa (${formatDelta(data.organic.delta28d)}): qual página/perfil explica a queda?`);
  } else {
    lines.push(`- Monitorar Δ7d ${formatDelta(data.organic.delta7d)} e alertar se queda ≥ 20% em 7d.`);
  }
  lines.push('');
  return lines.join('\n');
}

export async function run(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const propertyId = options.propertyId || process.env.GA4_PROPERTY_ID;
  const metricsDir = options.metricsDir || process.env.METRICS_DIR || path.join(ROOT, 'metrics');
  if (!propertyId) {
    throw new Error('GA4_PROPERTY_ID não definida');
  }
  const serviceAccount = options.serviceAccount || loadServiceAccount();
  const token = await getAccessToken(serviceAccount, fetchImpl);

  const endDate = options.endDate || isoDate(new Date());
  const startDate = addDays(endDate, -(SERIES_DAYS - 1));
  const pagesFrom = addDays(endDate, -6);
  const pagesPrevFrom = addDays(endDate, -13);
  const pagesPrevTo = addDays(endDate, -7);

  const [dailyReport, pagesReport, pagesPrevReport] = await Promise.all([
    runReport({
      token,
      property: propertyId,
      startDate,
      endDate,
      dimensions: ['date'],
      metrics: ['sessions', 'newUsers'],
      dimensionFilter: ORGANIC_FILTER,
    }, fetchImpl),
    runReport({
      token,
      property: propertyId,
      startDate: pagesFrom,
      endDate,
      dimensions: ['pagePath'],
      metrics: ['sessions'],
      dimensionFilter: ORGANIC_FILTER,
    }, fetchImpl),
    runReport({
      token,
      property: propertyId,
      startDate: pagesPrevFrom,
      endDate: pagesPrevTo,
      dimensions: ['pagePath'],
      metrics: ['sessions'],
      dimensionFilter: ORGANIC_FILTER,
    }, fetchImpl),
  ]);

  const series = fillSeries(reportRows(dailyReport), startDate, endDate);
  const organic = computeOrganicStats(series);
  const topPages = computeTopPages(reportRows(pagesReport), reportRows(pagesPrevReport));

  const jsonPath = path.join(metricsDir, 'ga4-daily.json');
  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    existing = null;
  }
  const validExisting = existing
    && existing.schemaVersion === SCHEMA_VERSION
    && Array.isArray(existing.organic?.daily);

  const data = {
    schemaVersion: SCHEMA_VERSION,
    date: endDate,
    property: `properties/${String(propertyId).replace(/^properties\//, '')}`,
    organic: {
      sessions: organic.sessions,
      delta7d: organic.delta7d,
      delta28d: organic.delta28d,
      newUsers: organic.newUsers,
      daily: mergeHistory(
        validExisting ? existing.organic.daily : null,
        series,
        organic.effectiveEnd
      ),
    },
    topPages,
    anomaly: organic.anomaly,
    fetchedAt: new Date().toISOString(),
  };

  fs.mkdirSync(metricsDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  const summaryPath = path.join(metricsDir, 'SUMMARY.md');
  fs.writeFileSync(summaryPath, buildSummary(data));

  return { data, jsonPath, summaryPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(({ data, jsonPath, summaryPath }) => {
    console.log(`OK ${data.date}: ${data.organic.sessions} sessões 7d, Δ7d ${data.organic.delta7d}, anomaly=${data.anomaly}`);
    console.log(`Gravado: ${jsonPath}`);
    console.log(`Gravado: ${summaryPath}`);
  }).catch((error) => {
    console.error(`fetch-ga4 falhou: ${error.message}`);
    process.exitCode = 1;
  });
}
