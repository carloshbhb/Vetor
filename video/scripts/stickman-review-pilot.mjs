import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildCaptionEntries,
  buildNarrationTimings,
  buildTimedCaptionEntries,
} from "./video-format.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VIDEO_DIR = path.join(ROOT, "video");
const PUBLIC_DIR = path.join(VIDEO_DIR, "public");
const ASSET_DIR = path.join(PUBLIC_DIR, "assets");
const OUTPUT_DIR = path.join(VIDEO_DIR, "out");
const PRODUCT_IMAGE_URL = "https://http2.mlstatic.com/D_NQ_NP_892965-MLU75401954380_042024-O.webp";
const PRODUCT_IMAGE = path.join(ASSET_DIR, "galaxy-fit3-stickman-pilot.webp");
const AUDIO_FILE = path.join(ASSET_DIR, "galaxy-fit3-stickman-pilot.mp3");
const BOUNDARIES_FILE = path.join(OUTPUT_DIR, "galaxy-fit3-stickman-word-boundaries.jsonl");
const PROPS_FILE = path.join(OUTPUT_DIR, "galaxy-fit3-stickman-remotion-props.json");
const FINAL_VIDEO = path.join(OUTPUT_DIR, "stickman-galaxy-fit3-remotion.mp4");

const title = "Samsung Galaxy Fit3 Rosa Nude";
const category = "Wearables / Smartbands";
const score = 9.2;
const hook = "A Galaxy Fit3 vale a pena ou falta algo importante?";
const callToAction = "Leia a análise completa e confira preço e condições atuais no Vetor.blog.";
const scenes = [
  {
    id: 1,
    text: "A Samsung Galaxy Fit3 combina corpo de alumínio com tela AMOLED de 1,6 polegada.",
    visualCue: "Corpo de alumínio e tela AMOLED",
    brollKeywords: [],
  },
  {
    id: 2,
    text: "A resolução de 256 por 402 pixels dá espaço para notificações e informações de treino.",
    visualCue: "Tela AMOLED de 1,6 polegada",
    brollKeywords: [],
  },
  {
    id: 3,
    text: "A Samsung informa até 13 dias de bateria em condições de uso típicas.",
    visualCue: "Até 13 dias de bateria",
    brollKeywords: [],
  },
  {
    id: 4,
    text: "A proteção 5 ATM e IP68 ajuda a usar a pulseira em atividades com água.",
    visualCue: "Proteção 5 ATM e IP68",
    brollKeywords: [],
  },
  {
    id: 5,
    text: "Ela acompanha frequência cardíaca, oxigênio no sangue e movimento, com recursos de sono.",
    visualCue: "Sensores e monitoramento",
    brollKeywords: [],
  },
  {
    id: 6,
    text: "Mas não tem GPS integrado: para mapear rotas ao ar livre, depende do celular.",
    visualCue: "Sem GPS integrado",
    brollKeywords: [],
  },
  {
    id: 7,
    text: "Também não oferece NFC para pagamentos por aproximação e a experiência completa é voltada ao Android.",
    visualCue: "Sem NFC e compatibilidade Android",
    brollKeywords: [],
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    timeout: options.timeout || 600000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-8000);
    throw new Error(
      command + " failed (exit=" + result.status + "): " +
      (result.error?.message || detail || "sem diagnóstico")
    );
  }
  return result;
}

async function downloadProductImage() {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const response = await fetch(PRODUCT_IMAGE_URL, {
    headers: { "User-Agent": "VetorBlog-StickmanPilot/1.0", Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Imagem do produto indisponível (HTTP " + response.status + ").");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000) throw new Error("A imagem do produto retornou um arquivo pequeno demais.");
  fs.writeFileSync(PRODUCT_IMAGE, bytes);
  console.log("[STICKMAN_ASSET] product image bytes=" + bytes.length);
}

function audioDuration(filePath) {
  const result = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number(String(result.stdout || "").trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("ffprobe não conseguiu validar a duração do Edge TTS.");
  return duration;
}

function fallbackTimings(segments, totalDuration) {
  const weights = segments.map((segment) => Math.max(1, String(segment.text || "").split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  return segments.map((segment, index) => {
    const start = cursor;
    const end = index === segments.length - 1 ? totalDuration : start + totalDuration * weights[index] / totalWeight;
    cursor = end;
    return { ...segment, start, end, duration: Math.max(0.05, end - start) };
  });
}

function loadBoundaries(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((item) => item && item.type === "WordBoundary");
}

async function generateVoiceover(fullText) {
  fs.mkdirSync(path.dirname(AUDIO_FILE), { recursive: true });
  if (fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE);
  if (fs.existsSync(BOUNDARIES_FILE)) fs.unlinkSync(BOUNDARIES_FILE);
  const python = process.env.PYTHON || "python";
  run(python, [
    path.join(ROOT, "scripts", "tts.py"),
    fullText,
    AUDIO_FILE,
  ], {
    env: {
      ...process.env,
      EDGE_TTS_BOUNDARIES_PATH: BOUNDARIES_FILE,
      EDGE_TTS_RATE: process.env.EDGE_TTS_RATE || "+5%",
    },
    timeout: 180000,
  });
  if (!fs.existsSync(AUDIO_FILE) || fs.statSync(AUDIO_FILE).size < 1000) {
    throw new Error("Edge TTS não produziu áudio utilizável para o piloto local.");
  }
  const duration = audioDuration(AUDIO_FILE);
  const boundaries = loadBoundaries(BOUNDARIES_FILE);
  console.log("[STICKMAN_TTS] voice=pt-BR-FranciscaNeural duration=" + duration.toFixed(2) +
    "s wordBoundaries=" + boundaries.length);
  return { duration, boundaries };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await downloadProductImage();

  const segments = [
    { kind: "hook", text: hook },
    ...scenes.map((scene) => ({ kind: "scene", text: scene.text })),
    { kind: "cta", text: callToAction },
  ];
  const fullText = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
  const voice = await generateVoiceover(fullText);
  const exact = buildNarrationTimings(segments, voice.boundaries, voice.duration);
  const narrationTimings = exact || fallbackTimings(segments, voice.duration);
  console.log("[STICKMAN_TIMING] " + (exact ? "Edge WordBoundary exact" : "weighted fallback"));

  const fps = 30;
  const hookDuration = Math.max(0.5, narrationTimings[0]?.duration || 3);
  const spokenScenes = scenes.map((scene, index) => {
    const timing = narrationTimings[index + 1];
    return {
      ...scene,
      duration: timing?.duration || 1,
      startFrame: Math.max(0, Math.round((timing?.start || 0) * fps)),
      endFrame: Math.max(1, Math.round((timing?.end || 0) * fps)),
    };
  });

  const subtitleOptions = { maxWords: 8, maxLineChars: 48 };
  const timedCaptions = buildTimedCaptionEntries(segments, voice.boundaries, subtitleOptions);
  const subtitleEntries = timedCaptions || buildCaptionEntries(narrationTimings, 8, { maxLineChars: 48 });

  const input = {
    type: "long",
    templateId: "stickman-review",
    title,
    imageUrl: "/assets/galaxy-fit3-stickman-pilot.webp",
    score,
    category,
    hook,
    hookDuration,
    scenes: spokenScenes,
    callToAction,
    audioUrl: "/assets/galaxy-fit3-stickman-pilot.mp3",
    subtitleEntries,
    productImages: ["/assets/galaxy-fit3-stickman-pilot.webp"],
    brollVideos: [],
    totalDuration: voice.duration,
    fps,
    reviewUrl: "https://www.vetor.blog/reviews/samsung-galaxy-fit3-rosa-nude-review",
  };

  fs.writeFileSync(PROPS_FILE, JSON.stringify(input, null, 2));
  const tsx = path.join(VIDEO_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  if (!fs.existsSync(tsx)) throw new Error("tsx do projeto de vídeo não foi instalado.");
  const renderStarted = Date.now();
  run(process.execPath, [tsx, "src/utils/renderVideo.ts", "long", PROPS_FILE], {
    cwd: VIDEO_DIR,
    stdio: "inherit",
    timeout: 2700000,
  });

  const candidates = fs.readdirSync(OUTPUT_DIR)
    .filter((name) => /^(?:long-review|stickman-review)-.*\.mp4$/i.test(name))
    .map((name) => ({ name, path: path.join(OUTPUT_DIR, name), mtime: fs.statSync(path.join(OUTPUT_DIR, name)).mtimeMs }))
    .filter((item) => item.mtime >= renderStarted - 1000)
    .sort((a, b) => b.mtime - a.mtime);

  if (!candidates.length) throw new Error("Remotion terminou sem produzir um MP4 novo.");
  fs.copyFileSync(candidates[0].path, FINAL_VIDEO);

  const probe = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
    "-of", "json",
    FINAL_VIDEO,
  ]);
  const media = JSON.parse(probe.stdout);
  const stream = media.streams?.find((item) => item.codec_type === "video");
  if (!stream || Number(stream.width) !== 1920 || Number(stream.height) !== 1080 ||
      !Number.isFinite(Number(media.format?.duration)) || fs.statSync(FINAL_VIDEO).size < 10000) {
    throw new Error("O MP4 local não passou pela validação básica de formato, resolução e duração.");
  }

  const beats = (subtitleEntries || [])
    .filter((entry) => entry.segmentKind === "scene")
    .map((entry) => ({ start: Number(entry.start), end: Number(entry.end), text: String(entry.text || "") }))
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end) && entry.end > entry.start && entry.text);
  const beatsPath = path.join(OUTPUT_DIR, "stickman-galaxy-fit3-remotion-beats.json");
  const framesDir = path.join(OUTPUT_DIR, "stickman-galaxy-fit3-remotion-qa-frames");
  fs.writeFileSync(beatsPath, JSON.stringify(beats, null, 2));

  let qaPassed = false;
  let qaOutput = "";
  const qaArgs = ["check", FINAL_VIDEO, "--beats", beatsPath, "--channel", "yt-landscape", "--max-dead", "1", "--frames", framesDir, "--json"];
  try {
    const qa = run(process.env.REMOTION_QA_BIN || "remotion-qa", qaArgs, { timeout: 180000 });
    qaPassed = true;
    qaOutput = String(qa.stdout || qa.stderr || "").slice(-7000);
  } catch (error) {
    qaOutput = error instanceof Error ? error.message.slice(-7000) : String(error).slice(-7000);
    console.error("[STICKMAN_LOCAL_QA_FAILED] " + qaOutput);
  }

  const report = {
    product: title,
    reviewUrl: input.reviewUrl,
    template: "StickmanReviewLandscape",
    engine: "Remotion",
    voice: "pt-BR-FranciscaNeural",
    durationSeconds: Number(media.format.duration),
    width: stream.width,
    height: stream.height,
    fileBytes: fs.statSync(FINAL_VIDEO).size,
    narrationAlignment: exact ? "edge-word-boundaries" : "weighted-fallback",
    captionCues: subtitleEntries.length,
    visualScenes: spokenScenes.length,
    qaPassed,
    qaOutput,
    videoPath: FINAL_VIDEO,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "stickman-galaxy-fit3-remotion-report.json"), JSON.stringify(report, null, 2));
  console.log("[STICKMAN_LOCAL_RENDER] " + JSON.stringify(report, null, 2));

  if (!qaPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[STICKMAN_LOCAL_RENDER_FAILED] " + (error instanceof Error ? error.stack || error.message : String(error)));
  process.exitCode = 1;
});
