import fs from "node:fs/promises";

const SITE_URL = (process.env.VETOR_SITE_URL || "https://www.vetor.blog").replace(/\/$/, "");
const CRON_SECRET = String(process.env.CRON_SECRET || "").trim();
const APPLY = process.env.APPLY_UPDATES === "true";
const BATCH_SIZE = 5;

async function queueApi(action, payload = {}) {
  if (!CRON_SECRET) throw new Error("CRON_SECRET ausente.");
  const response = await fetch(SITE_URL + "/api/cron/video-queue-worker/", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + CRON_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true) {
    throw new Error("Production metadata API HTTP " + response.status + ": " + (result.error || "resposta inválida"));
  }
  return result;
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply-production-oauth" : "dry-run",
    total: 0,
    batches: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    searchListingLinks: 0,
    results: [],
  };

  try {
    const preview = await queueApi("metadataBatch", { limit: 500 });
    const total = Array.isArray(preview.videos) ? preview.videos.length : 0;
    report.total = total;
    console.log("[youtube-metadata] production_queue_records=" + total);

    if (!APPLY) {
      console.log("[youtube-metadata] dry-run concluído; nenhum vídeo foi alterado.");
      await fs.writeFile("youtube-metadata-report.json", JSON.stringify(report, null, 2));
      return;
    }

    const oauth = await queueApi("youtubeOAuthCheck");
    if (oauth.authorized !== true) throw new Error("OAuth do YouTube em Production não foi confirmado.");
    console.log("[youtube-metadata] YouTube OAuth confirmado diretamente no ambiente Production do Vetor.");

    let offset = 0;
    while (offset < total) {
      const batch = await queueApi("refreshYouTubeMetadata", { offset, limit: BATCH_SIZE });
      report.batches += 1;
      report.updated += Number(batch.updated || 0);
      report.failed += Number(batch.failed || 0);
      report.skipped += Number(batch.skipped || 0);
      report.searchListingLinks += Number(batch.searchListingLinks || 0);
      report.results.push(...(Array.isArray(batch.results) ? batch.results : []));
      console.log(
        "[youtube-metadata] batch offset=" + offset +
        " updated=" + Number(batch.updated || 0) +
        " failed=" + Number(batch.failed || 0) +
        " skipped=" + Number(batch.skipped || 0) +
        " total=" + total
      );

      const nextOffset = Number(batch.nextOffset);
      if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
        throw new Error("A API não avançou o cursor; lote interrompido para evitar repetição.");
      }
      offset = nextOffset;
      if (batch.stopped === true) {
        throw new Error("YouTube interrompeu os próximos lotes por permissão OAuth ou cota. Consulte os resultados já registrados.");
      }
    }

    console.log(
      "[youtube-metadata] finished total=" + total +
      " updated=" + report.updated +
      " failed=" + report.failed +
      " skipped=" + report.skipped +
      " search_listing_destinations=" + report.searchListingLinks
    );
    await fs.writeFile("youtube-metadata-report.json", JSON.stringify(report, null, 2));
    if (report.failed > 0) process.exitCode = 1;
  } catch (error) {
    report.error = String(error?.message || error).slice(0, 1000);
    await fs.writeFile("youtube-metadata-report.json", JSON.stringify(report, null, 2));
    throw error;
  }
}

main().catch((error) => {
  console.error("[youtube-metadata] fatal: " + String(error?.message || error));
  process.exitCode = 1;
});
