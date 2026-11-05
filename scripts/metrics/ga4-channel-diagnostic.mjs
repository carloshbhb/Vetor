/**
 * Diagnóstico read-only do GA4.
 *
 * O fetch diário só consulta sessões orgânicas. Quando o resultado é zero,
 * não dá para distinguir "a tag não está coletando" de "não existe tráfego
 * orgânico". Este script consulta a mesma propriedade SEM filtro de canal,
 * para comparar o total com o recorte orgânico.
 *
 * Não escreve nada: apenas imprime o resultado no log.
 */
import {
  addDays,
  getAccessToken,
  isoDate,
  loadServiceAccount,
  reportRows,
  runReport,
} from './fetch-ga4.mjs';

const WINDOW_DAYS = 28;
const LONG_WINDOW_DAYS = 90;

function total(report) {
  const rows = report.rows || [];
  if (!rows.length) return 0;
  return Number(rows[0].metricValues?.[0]?.value || 0);
}

async function main() {
  const sa = loadServiceAccount();
  const property = process.env.GA4_PROPERTY_ID;
  if (!property) throw new Error('Credenciais ausentes: defina GA4_PROPERTY_ID');

  const token = await getAccessToken(sa);
  const today = new Date();
  const endDate = isoDate(today);
  const startDate = addDays(today, -WINDOW_DAYS + 1);
  const longStartDate = addDays(today, -LONG_WINDOW_DAYS + 1);

  // 1) Total sem filtro de canal
  const totalReport = await runReport({
    token,
    property,
    startDate,
    endDate,
    metrics: ['sessions', 'totalUsers', 'screenPageViews'],
  });

  // 2) Breakdown por canal padrão (sem filtro)
  const channelReport = await runReport({
    token,
    property,
    startDate,
    endDate,
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions'],
  });

  // 3) Série diária sem filtro: mostra se existe qualquer dado no período
  const dailyReport = await runReport({
    token,
    property,
    startDate: longStartDate,
    endDate,
    dimensions: ['date'],
    metrics: ['sessions'],
  });

  const dailyRows = reportRows(dailyReport);
  const daysWithData = dailyRows.filter((row) => row.metrics[0] > 0);
  const longTotal = dailyRows.reduce((sum, row) => sum + row.metrics[0], 0);

  const channels = reportRows(channelReport)
    .map((row) => ({ channel: row.dimensions[0], sessions: row.metrics[0] }))
    .sort((a, b) => b.sessions - a.sessions);

  const result = {
    property: `properties/${String(property).replace(/^properties\//, '')}`,
    window: { startDate, endDate, days: WINDOW_DAYS },
    totals: {
      sessions: total(totalReport),
      users: Number(totalReport.rows?.[0]?.metricValues?.[1]?.value || 0),
      pageViews: Number(totalReport.rows?.[0]?.metricValues?.[2]?.value || 0),
    },
    channels,
    longWindow: {
      startDate: longStartDate,
      endDate,
      days: LONG_WINDOW_DAYS,
      sessions: longTotal,
      daysWithData: daysWithData.length,
      firstDayWithData: daysWithData[0]?.dimensions?.[0] || null,
      lastDayWithData: daysWithData[daysWithData.length - 1]?.dimensions?.[0] || null,
    },
    diagnosis: diagnose({
      totals: {
        sessions: total(totalReport),
        users: Number(totalReport.rows?.[0]?.metricValues?.[1]?.value || 0),
      },
      channels,
      longTotal,
      daysWithData: daysWithData.length,
    }),
  };

  console.log(JSON.stringify(result, null, 2));
}

function diagnose({ totals, channels, longTotal, daysWithData }) {
  const organic = channels
    .filter((entry) => String(entry.channel).toLowerCase().startsWith('organic'))
    .reduce((sum, entry) => sum + entry.sessions, 0);

  if (totals.sessions === 0 && longTotal === 0) {
    return 'Nenhuma sessão registrada na propriedade: a coleta do GA4 não está chegando (tag ausente, bloqueada pelo consentimento, filtro de origem ou propriedade errada).';
  }
  if (organic === 0 && totals.sessions > 0) {
    return `A coleta funciona (${totals.sessions} sessões no período, ${longTotal} em ${LONG_WINDOW_DAYS} dias) mas não há canal orgânico: o problema é indexação/ranking, não instrumentação.`;
  }
  if (daysWithData === 0) {
    return 'Há sessões no total, mas sem série diária: verificar retenção/dateRanges.';
  }
  return `Coleta e canal orgânico ativos (${organic} sessões orgânicas de ${totals.sessions}).`;
}

main().catch((error) => {
  console.error(`ga4-channel-diagnostic falhou: ${error.message}`);
  process.exitCode = 1;
});
