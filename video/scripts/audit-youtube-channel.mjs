import fs from "node:fs/promises";

const SITE_URL = (process.env.VETOR_SITE_URL || "https://www.vetor.blog").replace(/\/$/, "");
const CRON_SECRET = String(process.env.CRON_SECRET || "").trim();
const YT_API = "https://www.googleapis.com/youtube/v3";

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

async function youtubeApi(path, accessToken) {
  const response = await fetch(YT_API + "/" + path, {
    headers: { Authorization: "Bearer " + accessToken },
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.message || "erro desconhecido";
    throw new Error("YouTube API HTTP " + response.status + ": " + reason);
  }
  return data;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("[youtube-audit] starting read-only channel inventory");

  const auth = await productionApi("youtubeAccessToken");
  if (!auth.accessToken) throw new Error("Production não retornou access token do YouTube.");

  const channelData = await youtubeApi(
    "channels?part=id,snippet,contentDetails&mine=true&maxResults=1",
    auth.accessToken,
  );
  const channel = channelData.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel?.id || !uploadsPlaylistId) {
    throw new Error("Não foi possível identificar o canal autenticado e sua playlist de uploads.");
  }

  const playlistItems = [];
  let pageToken = "";
  let playlistPages = 0;
  let playlistTotalResults = 0;
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,status",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await youtubeApi("playlistItems?" + params.toString(), auth.accessToken);
    playlistPages += 1;
    playlistTotalResults = Number(page.pageInfo?.totalResults || playlistTotalResults || 0);
    for (const item of page.items || []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
      playlistItems.push({
        videoId,
        title: item.snippet?.title || "",
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null,
        playlistItemStatus: item.status?.privacyStatus || null,
      });
    }
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  const channelVideoIds = [...new Set(playlistItems.map((item) => item.videoId).filter(Boolean))];
  const videoDetails = [];
  for (let offset = 0; offset < channelVideoIds.length; offset += 50) {
    const ids = channelVideoIds.slice(offset, offset + 50);
    const params = new URLSearchParams({ part: "id,snippet,status", id: ids.join(",") });
    const result = await youtubeApi("videos?" + params.toString(), auth.accessToken);
    videoDetails.push(...(result.items || []).map((video) => ({
      videoId: video.id,
      title: video.snippet?.title || "",
      publishedAt: video.snippet?.publishedAt || null,
      privacyStatus: video.status?.privacyStatus || null,
      uploadStatus: video.status?.uploadStatus || null,
    })));
  }

  const queueData = await productionApi("metadataBatch", { limit: 500 });
  const queueVideos = (queueData.videos || []).map((video) => ({
    videoId: String(video.youtube_video_id || ""),
    title: String(video.product_title || ""),
    youtubeUrl: String(video.youtube_url || ""),
    status: String(video.status || ""),
    completedAt: video.completed_at || null,
  })).filter((video) => video.videoId);

  const channelIdSet = new Set(channelVideoIds);
  const queueIdSet = new Set(queueVideos.map((video) => video.videoId));
  const detailsById = new Map(videoDetails.map((video) => [video.videoId, video]));
  const playlistById = new Map(playlistItems.filter((item) => item.videoId).map((item) => [item.videoId, item]));

  const onlyInChannel = channelVideoIds
    .filter((id) => !queueIdSet.has(id))
    .map((id) => detailsById.get(id) || playlistById.get(id) || { videoId: id });
  const onlyInQueue = queueVideos
    .filter((video) => !channelIdSet.has(video.videoId))
    .map((video) => ({
      ...video,
      detail: detailsById.get(video.videoId) || null,
      likelyRemovedOrNotInUploads: true,
    }));
  const inBothCount = [...channelIdSet].filter((id) => queueIdSet.has(id)).length;
  const unavailablePlaylistItems = playlistItems.filter((item) => !item.videoId).length;
  const missingVideoDetails = channelVideoIds.filter((id) => !detailsById.has(id));

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    mode: "read-only",
    channel: {
      id: channel.id,
      title: channel.snippet?.title || "",
      uploadsPlaylistId,
    },
    youtube: {
      uploadsPlaylistTotalResults: playlistTotalResults,
      playlistItemsFetched: playlistItems.length,
      uniqueVideoIdsInUploadsPlaylist: channelVideoIds.length,
      videosWithDetailsReturnedByApi: videoDetails.length,
      playlistItemsWithoutVideoId: unavailablePlaylistItems,
      playlistVideoIdsWithoutVideoDetails: missingVideoDetails,
      pagesFetched: playlistPages,
    },
    vetorQueue: {
      completedVideoRowsReturned: queueVideos.length,
      uniqueVideoIds: queueIdSet.size,
    },
    comparison: {
      presentInBoth: inBothCount,
      presentOnChannelButMissingFromQueue: onlyInChannel.length,
      presentInQueueButNotInChannelUploads: onlyInQueue.length,
    },
    onlyInChannel,
    onlyInQueue,
    videoDetails,
    playlistItems,
  };

  await fs.writeFile("youtube-channel-audit-report.json", JSON.stringify(report, null, 2));
  const lines = [
    "video_id,title,published_at,privacy_status,source",
    ...videoDetails.map((video) => [
      video.videoId,
      JSON.stringify(video.title),
      video.publishedAt || "",
      video.privacyStatus || "",
      queueIdSet.has(video.videoId) ? "channel_and_vetor_queue" : "channel_only",
    ].join(",")),
    ...onlyInQueue.map((video) => [
      video.videoId,
      JSON.stringify(video.title),
      "",
      "",
      "vetor_queue_only_not_in_uploads_playlist",
    ].join(",")),
  ];
  await fs.writeFile("youtube-channel-audit-report.csv", lines.join("\n") + "\n");

  console.log("[youtube-audit] channel=" + (channel.snippet?.title || channel.id));
  console.log("[youtube-audit] uploads_playlist_total=" + playlistTotalResults);
  console.log("[youtube-audit] unique_upload_video_ids=" + channelVideoIds.length);
  console.log("[youtube-audit] youtube_video_details=" + videoDetails.length);
  console.log("[youtube-audit] vetor_queue_unique_ids=" + queueIdSet.size);
  console.log("[youtube-audit] present_in_both=" + inBothCount);
  console.log("[youtube-audit] channel_only=" + onlyInChannel.length);
  console.log("[youtube-audit] queue_only_not_in_channel=" + onlyInQueue.length);
  console.log("[youtube-audit] report_written=true");
}

main().catch((error) => {
  console.error("[youtube-audit] failed: " + String(error?.message || error).slice(0, 1000));
  process.exitCode = 1;
});
