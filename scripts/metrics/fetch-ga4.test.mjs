import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addDays,
  buildServiceAccountJwt,
  buildSummary,
  computeOrganicStats,
  computeTopPages,
  fillSeries,
  mergeHistory,
  reportRows,
  run,
} from './fetch-ga4.mjs';

const END_DATE = '2026-09-30';
const START_DATE = addDays(END_DATE, -55);

function makeKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}

function baseSeries(sessionFn) {
  const rows = [];
  for (let date = START_DATE; date <= END_DATE; date = addDays(date, 1)) {
    const sessions = sessionFn(date);
    rows.push({ date, sessions, newUsers: Math.floor(sessions / 2) });
  }
  return rows;
}

function seriesWithConstantLast7(totalDays, last7Value, baseValue) {
  const rows = [];
  const start = addDays(END_DATE, -(totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    const sessions = i >= totalDays - 7 ? last7Value : baseValue;
    rows.push({ date, sessions, newUsers: 0 });
  }
  return rows;
}

test('buildServiceAccountJwt gera JWT RS256 verificável', () => {
  const { privateKey, publicKey } = makeKeyPair();
  const jwt = buildServiceAccountJwt({
    client_email: 'sa@test.iam.gserviceaccount.com',
    private_key: privateKey,
  }, 1700000000);
  const parts = jwt.split('.');
  assert.equal(parts.length, 3);
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  assert.equal(header.alg, 'RS256');
  assert.equal(claims.iss, 'sa@test.iam.gserviceaccount.com');
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/analytics.readonly');
  assert.equal(claims.exp - claims.iat, 3600);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  assert.equal(verifier.verify(publicKey, Buffer.from(parts[2], 'base64url')), true);
});

test('fillSeries preenche datas sem dado com zero', () => {
  const rows = [
    { dimensions: ['2026-09-29'], metrics: [12, 5] },
    { dimensions: ['2026-09-30'], metrics: [8, 3] },
  ];
  const series = fillSeries(rows, '2026-09-28', '2026-09-30');
  assert.deepEqual(series, [
    { date: '2026-09-28', sessions: 0, newUsers: 0 },
    { date: '2026-09-29', sessions: 12, newUsers: 5 },
    { date: '2026-09-30', sessions: 8, newUsers: 3 },
  ]);
});

test('computeOrganicStats calcula deltas 7/28d e mantém anomaly=false sem salto', () => {
  const series = seriesWithConstantLast7(56, 20, 10);
  const stats = computeOrganicStats(series);
  assert.equal(stats.sessions, 140);
  assert.equal(stats.delta7d, 1);
  assert.equal(stats.delta28d, 0.25);
  assert.equal(stats.anomaly, false);
  assert.equal(stats.effectiveEnd, END_DATE);
  assert.equal(stats.daily.length, 28);
  assert.equal(stats.newUsers, 0);
});

test('computeOrganicStats marca anomaly quando o último dia sobe >50%', () => {
  const series = seriesWithConstantLast7(56, 10, 10);
  series[series.length - 1].sessions = 20;
  const stats = computeOrganicStats(series);
  assert.equal(stats.anomaly, true);
});

test('computeOrganicStats não marca anomaly em dia zero de tráfego', () => {
  const series = seriesWithConstantLast7(56, 10, 10);
  series[series.length - 1].sessions = 0;
  const stats = computeOrganicStats(series);
  assert.equal(stats.anomaly, false);
  assert.equal(stats.effectiveEnd, addDays(END_DATE, -1));
});

test('computeOrganicStats falha com 0 sessões e com dados velhos', () => {
  const zero = seriesWithConstantLast7(56, 0, 0);
  assert.throws(() => computeOrganicStats(zero), /0 sessões orgânicas/);

  const stale = seriesWithConstantLast7(56, 10, 10);
  for (let i = stale.length - 5; i < stale.length; i++) stale[i].sessions = 0;
  assert.throws(() => computeOrganicStats(stale), /desatualizados/);
});

test('computeTopPages ordena por sessões e calcula delta7d', () => {
  const current = reportRows({
    rows: [
      { dimensionValues: [{ value: '/b' }], metricValues: [{ value: '5' }] },
      { dimensionValues: [{ value: '/a' }], metricValues: [{ value: '10' }] },
    ],
  });
  const previous = reportRows({
    rows: [
      { dimensionValues: [{ value: '/a' }], metricValues: [{ value: '20' }] },
      { dimensionValues: [{ value: '/c' }], metricValues: [{ value: '7' }] },
    ],
  });
  const top = computeTopPages(current, previous);
  assert.deepEqual(top, [
    { path: '/a', sessions: 10, delta7d: -0.5 },
    { path: '/b', sessions: 5, delta7d: null },
  ]);
});

test('computeTopPages limita a 20 páginas', () => {
  const current = Array.from({ length: 30 }, (_, i) => ({
    dimensions: [`/p${i}`],
    metrics: [30 - i],
  }));
  const top = computeTopPages(current, []);
  assert.equal(top.length, 20);
  assert.equal(top[0].path, '/p0');
});

test('mergeHistory faz seed, append e respeita retenção sem regenerar', () => {
  const series = baseSeries(() => 10);

  const seeded = mergeHistory(null, series, END_DATE);
  assert.equal(seeded.length, 56);
  assert.equal(seeded[seeded.length - 1].date, END_DATE);

  const existing = [
    { date: addDays(END_DATE, -1), sessions: 999 },
    { date: addDays(END_DATE, -2), sessions: 888 },
  ];
  const appended = mergeHistory(existing, series, END_DATE);
  assert.equal(appended.length, 3);
  assert.deepEqual(appended[0], { date: addDays(END_DATE, -2), sessions: 888 });
  assert.deepEqual(appended[1], { date: addDays(END_DATE, -1), sessions: 999 });
  assert.deepEqual(appended[2], { date: END_DATE, sessions: 10 });

  const many = Array.from({ length: 120 }, (_, i) => ({
    date: addDays(END_DATE, i - 119),
    sessions: i,
  }));
  const trimmed = mergeHistory(many, series, END_DATE, 90);
  assert.equal(trimmed.length, 90);
  assert.equal(trimmed[0].date, addDays(END_DATE, -119 + 30));
});

test('buildSummary contém tendência, top páginas, variações e perguntas', () => {
  const data = {
    schemaVersion: 1,
    date: END_DATE,
    organic: {
      sessions: 140,
      delta7d: 1,
      delta28d: -0.15,
      newUsers: 70,
      daily: [{ date: END_DATE, sessions: 20 }],
    },
    topPages: [{ path: '/a', sessions: 10, delta7d: -0.5 }],
    anomaly: false,
  };
  const summary = buildSummary(data);
  assert.match(summary, /Métricas GA4 — resumo diário/);
  assert.match(summary, /Δ7d \+100% \| Δ28d -15%/);
  assert.match(summary, /1\. `\/a` — 10 sessões/);
  assert.match(summary, /Maior queda: `\/a` -50%/);
  assert.match(summary, /Perguntas em aberto/);
  assert.match(summary, /Tendência 28d negativa/);
});

function makeFetchMock({ endDate = END_DATE, failReports = false, dailyRows, pageRows, prevPageRows } = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      if (String(url) === 'https://oauth2.googleapis.com/token') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ access_token: 'token-123', expires_in: 3600 }),
        };
      }
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      if (failReports) {
        return {
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ error: { message: 'Permission denied' } }),
        };
      }
      const body = JSON.parse(init.body);
      const isDaily = body.dimensions[0].name === 'date';
      const isPrevPages = body.dateRanges[0].endDate === addDays(endDate, -7);
      let rows;
      if (isDaily) rows = dailyRows || [];
      else if (isPrevPages) rows = prevPageRows || [];
      else rows = pageRows || [];
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ rows }),
      };
    },
  };
}

function ga4Row(dims, metrics) {
  return {
    dimensionValues: dims.map((value) => ({ value })),
    metricValues: metrics.map((value) => ({ value: String(value) })),
  };
}

function dailyReportRows(endDate = END_DATE) {
  const rows = [];
  const start = addDays(endDate, -55);
  for (let date = start; date <= endDate; date = addDays(date, 1)) {
    rows.push(ga4Row([date], [10, 5]));
  }
  return rows;
}

const testServiceAccount = () => {
  const { privateKey } = makeKeyPair();
  return {
    client_email: 'sa@test.iam.gserviceaccount.com',
    private_key: privateKey,
  };
};

test('run gera ga4-daily.json e SUMMARY.md com schema v1', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-'));
  const { fetchImpl } = makeFetchMock({
    dailyRows: dailyReportRows(),
    pageRows: [ga4Row(['/reviews/x'], [88])],
    prevPageRows: [ga4Row(['/reviews/x'], [60])],
  });
  const { data, jsonPath, summaryPath } = await run({
    fetchImpl,
    propertyId: 'properties/123456789',
    serviceAccount: testServiceAccount(),
    metricsDir: dir,
    endDate: END_DATE,
  });
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.date, END_DATE);
  assert.equal(data.property, 'properties/123456789');
  assert.equal(data.organic.sessions, 70);
  assert.equal(data.organic.newUsers, 35);
  assert.equal(data.organic.daily.length, 56);
  assert.equal(data.anomaly, false);
  assert.equal(data.topPages[0].path, '/reviews/x');
  assert.equal(data.topPages[0].sessions, 88);
  assert.equal(data.topPages[0].delta7d, Math.round(((88 - 60) / 60) * 10000) / 10000);

  const persisted = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(persisted.schemaVersion, 1);
  const summary = fs.readFileSync(summaryPath, 'utf8');
  assert.match(summary, /Top 10 páginas/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('run preserva histórico existente no append (nunca regenera)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-'));
  const jsonPath = path.join(dir, 'ga4-daily.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    schemaVersion: 1,
    date: addDays(END_DATE, -1),
    property: 'properties/1',
    organic: {
      sessions: 10,
      delta7d: 0,
      delta28d: 0,
      newUsers: 5,
      daily: [
        { date: addDays(END_DATE, -2), sessions: 777 },
        { date: addDays(END_DATE, -1), sessions: 888 },
      ],
    },
    topPages: [],
    anomaly: false,
  }));

  const { fetchImpl } = makeFetchMock({ dailyRows: dailyReportRows() });
  const { data } = await run({
    fetchImpl,
    propertyId: '1',
    serviceAccount: testServiceAccount(),
    metricsDir: dir,
    endDate: END_DATE,
  });
  const daily = data.organic.daily;
  assert.equal(daily.length, 3);
  assert.deepEqual(daily[0], { date: addDays(END_DATE, -2), sessions: 777 });
  assert.deepEqual(daily[1], { date: addDays(END_DATE, -1), sessions: 888 });
  assert.deepEqual(daily[2], { date: END_DATE, sessions: 10 });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('run falha (sem gravar) quando a API retorna 403', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-'));
  const { fetchImpl } = makeFetchMock({ failReports: true });
  await assert.rejects(
    run({
      fetchImpl,
      propertyId: '1',
      serviceAccount: testServiceAccount(),
      metricsDir: dir,
      endDate: END_DATE,
    }),
    /HTTP 403/
  );
  assert.equal(fs.existsSync(path.join(dir, 'ga4-daily.json')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('run falha com 0 sessões orgânicas (não grava lixo)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-'));
  const { fetchImpl } = makeFetchMock({
    dailyRows: [],
    pageRows: [],
    prevPageRows: [],
  });
  await assert.rejects(
    run({
      fetchImpl,
      propertyId: '1',
      serviceAccount: testServiceAccount(),
      metricsDir: dir,
      endDate: END_DATE,
    }),
    /0 sessões orgânicas/
  );
  assert.equal(fs.existsSync(path.join(dir, 'ga4-daily.json')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('run falha sem GA4_PROPERTY_ID e sem credenciais', async () => {
  const prevProperty = process.env.GA4_PROPERTY_ID;
  const prevJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const prevFile = process.env.GA4_SERVICE_ACCOUNT_FILE;
  delete process.env.GA4_PROPERTY_ID;
  delete process.env.GA4_SERVICE_ACCOUNT_JSON;
  delete process.env.GA4_SERVICE_ACCOUNT_FILE;
  try {
    await assert.rejects(run({ fetchImpl: async () => { throw new Error('não deve chamar'); } }), /GA4_PROPERTY_ID/);
    await assert.rejects(
      run({ fetchImpl: async () => { throw new Error('não deve chamar'); }, propertyId: '1' }),
      /Credenciais ausentes/
    );
  } finally {
    if (prevProperty !== undefined) process.env.GA4_PROPERTY_ID = prevProperty;
    if (prevJson !== undefined) process.env.GA4_SERVICE_ACCOUNT_JSON = prevJson;
    if (prevFile !== undefined) process.env.GA4_SERVICE_ACCOUNT_FILE = prevFile;
  }
});

test('run falha quando o token é negado', async () => {
  const fetchImpl = async (url) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'invalid_grant' }),
      };
    }
    throw new Error('não deve chegar nas reports');
  };
  await assert.rejects(
    run({
      fetchImpl,
      propertyId: '1',
      serviceAccount: testServiceAccount(),
      metricsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-')),
      endDate: END_DATE,
    }),
    /Falha na troca de token \(400\)/
  );
});
