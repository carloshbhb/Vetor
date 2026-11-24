import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SIZE = 32;
const PIXELS = SIZE * SIZE;
const DARK_PIXEL = 20;
const DARK_AVERAGE = 16;
const DARK_RATIO = 0.9;
const WARN_AVERAGE = 24;
const WARN_DARK_RATIO = 0.7;
const NEAR_DUPLICATE_DISTANCE = 6;
const REPEATED_PAIR_RATIO = 0.7;

function dctPerceptualHash(frame) {
  if (!Buffer.isBuffer(frame) || frame.length !== PIXELS) {
    throw new Error("Amostra visual precisa conter exatamente " + PIXELS + " pixels em escala de cinza.");
  }
  const values = Array.from(frame, Number);
  const coefficients = [];
  for (let v = 0; v < 8; v += 1) {
    for (let u = 0; u < 8; u += 1) {
      let sum = 0;
      for (let y = 0; y < SIZE; y += 1) {
        const cy = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * SIZE));
        for (let x = 0; x < SIZE; x += 1) {
          const cx = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE));
          sum += values[y * SIZE + x] * cx * cy;
        }
      }
      const au = u === 0 ? Math.sqrt(1 / SIZE) : Math.sqrt(2 / SIZE);
      const av = v === 0 ? Math.sqrt(1 / SIZE) : Math.sqrt(2 / SIZE);
      coefficients.push(sum * au * av);
    }
  }
  const medianSource = coefficients.slice(1).sort((a, b) => a - b);
  const median = medianSource[Math.floor(medianSource.length / 2)];
  let hash = 0n;
  for (let index = 0; index < coefficients.length; index += 1) {
    if (coefficients[index] > median) hash |= 1n << BigInt(index);
  }
  return hash;
}

function hammingDistance(left, right) {
  let value = BigInt(left) ^ BigInt(right);
  let count = 0;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
}

function measureFrame(frame) {
  if (!Buffer.isBuffer(frame) || frame.length !== PIXELS) {
    throw new Error("Amostra visual inválida para medição de luminância.");
  }
  let sum = 0;
  let dark = 0;
  for (const value of frame) {
    sum += value;
    if (value < DARK_PIXEL) dark += 1;
  }
  return {
    averageLuma: Number((sum / frame.length).toFixed(2)),
    darkPixelRatio: Number((dark / frame.length).toFixed(4)),
  };
}

export function evaluateVisualSamples(samples, {
  allowRepeatedScenes = false,
  allowDarkScenes = false,
  minSamplesForDiversity = 4,
} = {}) {
  const errors = [];
  const warnings = [];
  const measured = samples.map((sample, index) => {
    const metrics = measureFrame(sample.frame);
    return {
      id: String(sample.id ?? index + 1),
      timeSeconds: Number(sample.timeSeconds || 0),
      hash: dctPerceptualHash(sample.frame),
      ...metrics,
    };
  });

  for (const sample of measured) {
    if (sample.averageLuma < DARK_AVERAGE && sample.darkPixelRatio > DARK_RATIO && !allowDarkScenes) {
      errors.push(
        "Cena " + sample.id + " (" + sample.timeSeconds.toFixed(2) +
        "s) está visualmente subexposta: luminância média " + sample.averageLuma +
        " e " + (sample.darkPixelRatio * 100).toFixed(1) + "% de pixels quase pretos."
      );
    } else if (sample.averageLuma < WARN_AVERAGE && sample.darkPixelRatio > WARN_DARK_RATIO) {
      warnings.push(
        "Cena " + sample.id + " (" + sample.timeSeconds.toFixed(2) +
        "s) está escura; confira contraste, legibilidade e presença do produto."
      );
    }
  }

  const adjacentDistances = [];
  for (let index = 1; index < measured.length; index += 1) {
    adjacentDistances.push(hammingDistance(measured[index - 1].hash, measured[index].hash));
  }
  const nearDuplicatePairs = adjacentDistances.filter((distance) => distance <= NEAR_DUPLICATE_DISTANCE).length;
  const repeatedRatio = adjacentDistances.length
    ? nearDuplicatePairs / adjacentDistances.length
    : 0;

  if (measured.length >= minSamplesForDiversity && repeatedRatio >= REPEATED_PAIR_RATIO) {
    const detail = nearDuplicatePairs + "/" + adjacentDistances.length +
      " transições consecutivas têm composição praticamente idêntica (hash perceptual, limite " +
      NEAR_DUPLICATE_DISTANCE + "/64).";
    if (allowRepeatedScenes) warnings.push("Repetição visual permitida pelo estilo selecionado: " + detail);
    else errors.push("Sequência visual monótona: " + detail + " Varie enquadramento, distância, cenário ou mídia B-roll.");
  } else if (measured.length >= minSamplesForDiversity && repeatedRatio >= 0.45) {
    warnings.push(
      "Variedade visual limitada: " + nearDuplicatePairs + "/" + adjacentDistances.length +
      " transições consecutivas são quase duplicatas."
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sampleCount: measured.length,
    nearDuplicatePairs,
    adjacentDistances,
    repeatedPairRatio: Number(repeatedRatio.toFixed(3)),
    thresholds: {
      darkAverageLuma: DARK_AVERAGE,
      darkPixelRatio: DARK_RATIO,
      nearDuplicateDistance: NEAR_DUPLICATE_DISTANCE,
      repeatedPairRatio: REPEATED_PAIR_RATIO,
    },
    samples: measured.map(({ id, timeSeconds, averageLuma, darkPixelRatio }) => ({
      id, timeSeconds, averageLuma, darkPixelRatio,
    })),
  };
}

function runFfmpegFrame(input, timeSeconds) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-ss", String(Math.max(0, timeSeconds)),
    "-i", input,
    "-frames:v", "1",
    "-vf", "scale=" + SIZE + ":" + SIZE + ":flags=area,format=gray",
    "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1",
  ], {
    encoding: null,
    maxBuffer: 1024 * 1024,
    timeout: 30000,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout || result.stdout.length !== PIXELS) {
    throw new Error("FFmpeg não conseguiu extrair um frame em " + timeSeconds.toFixed(2) +
      "s: " + String(result.stderr || "sem detalhes").slice(-1200));
  }
  return result.stdout;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inline] = token.slice(2).split("=", 2);
    values[key] = inline === undefined ? argv[++index] : inline;
  }
  return values;
}

export function buildSceneSampleTimes(sceneDocument) {
  const document = sceneDocument && typeof sceneDocument === "object" ? sceneDocument : {};
  const fps = Number(document.fps) > 0 ? Number(document.fps) : 30;
  const scenes = Array.isArray(document.scenes) ? document.scenes : [];
  return scenes
    .map((scene, index) => {
      const start = Number(scene.startFrame) / fps;
      const end = Number(scene.endFrame) / fps;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return {
        id: String(scene.id ?? "scene-" + (index + 1)),
        timeSeconds: Number((start + (end - start) / 2).toFixed(3)),
      };
    })
    .filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input ? path.resolve(args.input) : null;
  const scenePath = args["scenes-json"] ? path.resolve(args["scenes-json"]) : null;
  const reportPath = args.report ? path.resolve(args.report) : null;
  if (!input || !fs.existsSync(input) || !fs.statSync(input).isFile()) {
    throw new Error("Informe --input com um MP4 existente.");
  }
  if (!scenePath || !fs.existsSync(scenePath)) {
    throw new Error("Informe --scenes-json com os limites temporais das cenas renderizadas.");
  }
  const sceneDocument = JSON.parse(fs.readFileSync(scenePath, "utf8"));
  const sceneTimes = buildSceneSampleTimes(sceneDocument);
  if (!sceneTimes.length) {
    throw new Error("Nenhuma cena com intervalo temporal válido foi fornecida ao QA visual.");
  }
  const samples = sceneTimes.map((scene) => ({
    ...scene,
    frame: runFfmpegFrame(input, scene.timeSeconds),
  }));
  const result = evaluateVisualSamples(samples, {
    allowRepeatedScenes: sceneDocument.allowRepeatedScenes === true,
    allowDarkScenes: sceneDocument.allowDarkScenes === true,
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
    process.stderr.write("[visual-artifact-qa] BLOCKED: " + result.errors.join(" | ") + "\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("[visual-artifact-qa] PASS\n");
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write("[visual-artifact-qa] " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  }
}
