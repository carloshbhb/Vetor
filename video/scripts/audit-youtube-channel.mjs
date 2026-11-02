import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SITE_URL = (process.env.VETOR_SITE_URL || "https://www.vetor.blog").replace(/\/$/, "");
const CRON_SECRET = String(process.env.CRON_SECRET || "").trim();
const STUDIO_REPORTED_VIDEO_COUNT = 254;

async function productionApi(action, payload = {}) {
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    throw new Error("Production API " + action + " HTTP " + response.status + ": " + (data.error || "resposta inválida"));
  }
  return data;
}

async function fetchPublicUploads(channelId) {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) {
    throw new Error("ID do canal salvo no Vetor é inválido.");
  }
  const uploadsPlaylistId = "UU" + channelId.slice(2);
  const playlistUrl = "https://www.youtube.com/playlist?list=" + uploadsPlaylistId;
  console.log("[youtube-audit] reading public uploads playlist via yt-dlp: " + uploadsPlaylistId);

  let stdout = "";
  let stderr = "";
  try {
    ({ stdout, stderr } = await execFileAsync("yt-dlp", [
      "--no-warnings",
      "--flat-playlist",
      "--dump-single-json",
      "--skip-download",
      "--playlist-end", "1000",
      "--js-runtimes", "node",
      "--remote-components", "ejs:github",
      "--socket-timeout", "30",
      "--extractor-retries", "3",
      playlistUrl,
    ], {
      maxBuffer: 80 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
      killSignal: "SIGTERM",
    }));
  } catch (error) {
    const message = String(error?.stderr || error?.message || error).slice(-4000);
    throw new Error("yt-dlp não conseguiu ler a playlist pública: " + message);
  }

  if (stderr.trim()) console.warn("[youtube-audit] yt-dlp warnings: " + stderr.trim().slice(-4000));
  const data = JSON.parse(String(stdout || "").trim());
  if (!Array.isArray(data.entries)) {
    throw new Error("yt-dlp não retornou uma lista de vídeos. Verifique a resposta da playlist.");
  }

  const entries = data.entries.map((entry) => ({
    videoId: String(entry?.id || "").trim(),
    title: String(entry?.title || ""),
    publishedAt: entry?.release_timestamp
      ? new Date(Number(entry.release_timestamp) * 1000).toISOString()
      : entry?.upload_date && /^\d{8}$/.test(String(entry.upload_date))
        ? String(entry.upload_date).slice(0, 4) + "-" + String(entry.upload_date).slice(4, 6) + "-" + String(entry.upload_date).slice(6, 8)
        : null,
    availability: String(entry?.availability || "public-list-entry"),
    duration: Number.isFinite(Number(entry?.duration)) ? Number(entry.duration) : null,
    url: String(entry?.webpage_url || (entry?.id ? "https://www.youtube.com/watch?v=" + entry.id : "")),
  })).filter((entry) => /^[A-Za-z0-9_-]{11}$/.test(entry.videoId));

  const unique = [...new Map(entries.map((entry) => [entry.videoId, entry])).values()];
  if (unique.length === 0) {
    throw new Error("Playlist retornou zero IDs de vídeo; auditoria interrompida para evitar um relatório enganoso.");
  }
  return {
    uploadsPlaylistId,
    playlistTitle: String(data.title || ""),
    extractor: String(data.extractor || ""),
    playlistCountReported: Number(data.playlist_count || data.n_entries || entries.length),
    rawEntryCount: entries.length,
    entries: unique,
    warnings: stderr.trim() ? stderr.trim().slice(-4000) : null,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("[youtube-audit] starting read-only channel inventory without YouTube Data API");

  const [channelData, queueData] = await Promise.all([
    productionApi("youtubeChannelInfo"),
    productionApi("metadataBatch", { limit: 500 }),
  ]);
  const channel = channelData.channel;
  if (!channel?.id) throw new Error("Production não retornou o canal salvo no OAuth.");

  const inventory = await fetchPublicUploads(String(channel.id));
  const queueVideos = (queueData.videos || []).map((video) => ({
    videoId: String(video.youtube_video_id || ""),
    title: String(video.product_title || ""),
    youtubeUrl: String(video.youtube_url || ""),
    status: String(video.status || ""),
    completedAt: video.completed_at || null,
  })).filter((video) => video.videoId);

  const channelIdSet = new Set(inventory.entries.map((item) => item.videoId));
  const queueIdSet = new Set(queueVideos.map((item) => item.videoId));
  const onlyInChannel = inventory.entries.filter((item) => !queueIdSet.has(item.videoId));
  const onlyInQueue = queueVideos
    .filter((item) => !channelIdSet.has(item.videoId))
    .map((item) => ({
      ...item,
      publicChannelStatus: item.videoId === "ISJf8yZbrH4"
        ? "owner-confirmed-removed"
        : "not-present-in-public-uploads-playlist",
      note: item.videoId === "ISJf8yZbrH4"
        ? "Canal owner confirmed this video was removed."
        : "Could be private, unlisted, deleted, or otherwise unavailable to a public playlist extraction.",
    }));
  const presentInBoth = [...channelIdSet].filter((id) => queueIdSet.has(id)).length;

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    mode: "read-only-public-channel-inventory",
    limitation: "yt-dlp reads public uploads only; private, unlisted, and deleted videos may not appear. Studio count is user-reported and not independently re-read.",
    channel: {
      id: String(channel.id),
      title: String(channel.title || ""),
    },
    studioReportedVideoCount: STUDIO_REPORTED_VIDEO_COUNT,
    publicUploads: {
      playlistId: inventory.uploadsPlaylistId,
      playlistTitle: inventory.playlistTitle,
      extractor: inventory.extractor,
      playlistCountReported: inventory.playlistCountReported,
      rawEntryCount: inventory.rawEntryCount,
      uniquePublicVideoIds: inventory.entries.length,
      warnings: inventory.warnings,
      entries: inventory.entries,
    },
    vetorQueue: {
      completedVideoRowsReturned: queueVideos.length,
      uniqueVideoIds: queueIdSet.size,
    },
    comparison: {
      presentInBoth: presentInBoth,
      presentOnPublicChannelButMissingFromQueue: onlyInChannel.length,
      presentInQueueButNotInPublicUploadsPlaylist: onlyInQueue.length,
      studioCountMinusPublicInventory: STUDIO_REPORTED_VIDEO_COUNT - inventory.entries.length,
    },
    onlyInChannel,
    onlyInQueue,
  };

  await fs.writeFile("youtube-channel-audit-report.json", JSON.stringify(report, null, 2));
  const csvRows = [
    ["video_id", "title", "published_at", "availability", "comparison_status"].join(","),
    ...inventory.entries.map((video) => [
      video.videoId,
      JSON.stringify(video.title),
      video.publishedAt || "",
      video.availability || "",
      queueIdSet.has(video.videoId) ? "channel_and_vetor_queue" : "channel_only",
    ].join(",")),
    ...onlyInQueue.map((video) => [
      video.videoId,
      JSON.stringify(video.title),
      "",
      "",
      video.publicChannelStatus,
    ].join(",")),
  ];
  await fs.writeFile("youtube-channel-audit-report.csv", csvRows.join("\n") + "\n");

  console.log("[youtube-audit] channel=" + (channel.title || channel.id));
  console.log("[youtube-audit] studio_reported_count=" + STUDIO_REPORTED_VIDEO_COUNT);
  console.log("[youtube-audit] public_upload_entries=" + inventory.rawEntryCount);
  console.log("[youtube-audit] unique_public_video_ids=" + inventory.entries.length);
  console.log("[youtube-audit] vetor_queue_unique_ids=" + queueIdSet.size);
  console.log("[youtube-audit] present_in_both=" + presentInBoth);
  console.log("[youtube-audit] channel_only=" + onlyInChannel.length);
  console.log("[youtube-audit] queue_only_not_public=" + onlyInQueue.length);
  console.log("[youtube-audit] report_written=true");
}

main().catch((error) => {
  console.error("[youtube-audit] failed: " + String(error?.message || error).slice(0, 1000));
  process.exitCode = 1;
});
