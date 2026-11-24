import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROFILES = {
  shorts: { width: 1080, height: 1920, label: "YouTube Shorts 9:16" },
  landscape: { width: 1920, height: 1080, label: "YouTube landscape 16:9" },
};

export function parseFrameRate(value) {
  if (typeof value !== "string") return 0;
  const [numerator, denominator] = value.split("/").map(Number);
  if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
    return numerator / denominator;
  }
  return Number(value) || 0;
}

export function parseProbePayload(payload) {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  return {
    duration: Number(data?.format?.duration || video?.duration || 0),
    size: Number(data?.format?.size || 0),
    video: video ? {
      codec: video.codec_name || null,
      width: Number(video.width || 0),
      height: Number(video.height || 0),
      fps: parseFrameRate(video.avg_frame_rate || video.r_frame_rate),
      pixelFormat: video.pix_fmt || null,
    } : null,
    audio: audio ? {
      codec: audio.codec_name || null,
      sampleRate: Number(audio.sample_rate || 0),
      channels: Number(audio.channels || 0),
    } : null,
  };
}

export function parseBlackSegments(stderr = "") {
  const segments = [];
  const pattern = /black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g;
  let match;
  while ((match = pattern.exec(String(stderr))) !== null) {
    segments.push({
      start: Number(match[1]),
      end: Number(match[2]),
      duration: Number(match[3]),
    });
  }
  return segments;
}

export function parseVolume(stderr = "") {
  const mean = String(stderr).match(/mean_volume:\s*(-?[\d.]+|-inf)\s*dB/i);
  const peak = String(stderr).match(/max_volume:\s*(-?[\d.]+|-inf)\s*dB/i);
  return {
    meanDb: mean ? (mean[1] === "-inf" ? -Infinity : Number(mean[1])) : null,
    peakDb: peak ? (peak[1] === "-inf" ? -Infinity : Number(peak[1])) : null,
  };
}

export function evaluateRenderArtifact({
  probe,
  profile = "shorts",
  blackSegments = [],
  volume = null,
  requireAudio = true,
  maxBlackSeconds = 1.2,
} = {}) {
  const errors = [];
  const warnings = [];
  const expected = PROFILES[profile];
  if (!expected) errors.push("Perfil de vídeo desconhecido: " + profile + ".");
  if (!probe?.video) errors.push("Arquivo não contém stream de vídeo.");
  if (!Number.isFinite(probe?.duration) || probe.duration <= 1) errors.push("Duração do vídeo ausente ou menor que 1 segundo.");
  if (!Number.isFinite(probe?.size) || probe.size <= 0) errors.push("Arquivo de vídeo vazio.");
  if (expected && probe?.video) {
    if (probe.video.width !== expected.width || probe.video.height !== expected.height) {
      errors.push("Resolução incorreta para " + expected.label + ": " + probe.video.width + "x" + probe.video.height + ".");
    }
    if (probe.video.fps < 23.9 || probe.video.fps > 60.1) {
      errors.push("FPS fora do intervalo de entrega (24–60): " + probe.video.fps + ".");
    }
  }
  if (requireAudio && !probe?.audio) errors.push("Entrega sem faixa de áudio.");
  if (probe?.audio && volume) {
    if (!Number.isFinite(volume.meanDb) || volume.meanDb < -48) {
      errors.push("Áudio ausente ou praticamente inaudível (média " + volume.meanDb + " dBFS).");
    }
    if (Number.isFinite(volume.peakDb) && volume.peakDb > -0.1) {
      warnings.push("Pico de áudio próximo ou acima de 0 dBFS: " + volume.peakDb + " dBFS.");
    }
  } else if (probe?.audio && !volume) {
    warnings.push("Medição de volume não foi coletada.");
  }
  const longestBlack = blackSegments.reduce((max, segment) => Math.max(max, segment.duration || 0), 0);
  if (longestBlack > maxBlackSeconds) {
    errors.push("Trecho preto contínuo de " + longestBlack.toFixed(2) + "s excede o limite de " + maxBlackSeconds + "s.");
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    profile,
    expectedResolution: expected ? expected.width + "x" + expected.height : null,
    durationSeconds: Number(probe?.duration || 0),
    fileBytes: Number(probe?.size || 0),
    video: probe?.video || null,
    audio: probe?.audio || null,
    longestBlackSeconds: Number(longestBlack.toFixed(3)),
    blackSegments,
    volume,
  };
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(command + " falhou: " + String(result.stderr || result.stdout || "sem detalhes").slice(-4000));
  }
  return result;
}

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inline] = token.slice(2).split("=", 2);
    values[key] = inline === undefined ? argv[++index] : inline;
  }
  return values;
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const input = path.resolve(String(args.input || ""));
  const profile = String(args.profile || "shorts");
  const reportPath = args.report ? path.resolve(args.report) : null;
  const requireAudio = args["require-audio"] !== "false";
  const maxBlackSeconds = Number(args["max-black-seconds"] || 1.2);
  if (!args.input || !fs.existsSync(input) || !fs.statSync(input).isFile()) {
    throw new Error("Informe --input com o caminho de um MP4 existente.");
  }
  const probeResult = run("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", input,
  ]);
  const probe = parseProbePayload(probeResult.stdout);
  let blackSegments = [];
  let volume = null;
  const blackResult = run("ffmpeg", [
    "-hide_banner", "-i", input, "-vf",
    "blackdetect=d=0.25:pix_th=0.02:pic_th=0.98",
    "-an", "-f", "null", "-",
  ]);
  blackSegments = parseBlackSegments(blackResult.stderr);
  if (probe.audio) {
    const volumeResult = run("ffmpeg", [
      "-hide_banner", "-i", input, "-af", "volumedetect", "-vn", "-f", "null", "-",
    ]);
    volume = parseVolume(volumeResult.stderr);
  }
  const result = evaluateRenderArtifact({
    probe, profile, blackSegments, volume, requireAudio, maxBlackSeconds,
  });
  const document = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    input: path.basename(input),
    ...result,
  };
  const json = JSON.stringify(document, null, 2) + "\n";
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, json, "utf8");
  }
  process.stdout.write(json);
  if (!result.ok) {
    process.stderr.write("[render-artifact-qa] BLOCKED: " + result.errors.join(" | ") + "\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("[render-artifact-qa] PASS\n");
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write("[render-artifact-qa] " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  }
}
