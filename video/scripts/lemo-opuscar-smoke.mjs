import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderWithLemoOpuscar } from "./render-lemo-opuscar.mjs";

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "vetor-lemo-opuscar-smoke-"));
const audioPath = path.join(workDir, "silence.wav");
const outputPath = path.join(workDir, "lemo-smoke.mp4");

try {
  execFileSync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "2", "-c:a", "pcm_s16le", audioPath,
  ], { stdio: "inherit", timeout: 60_000 });

  await renderWithLemoOpuscar({
    id: "ci-lemo-opuscar-smoke",
    type: "review",
    title: "Vetor Lemo-Opuscar smoke test",
    category: "Tecnologia",
    hook: "Motion graphics em código",
    scenes: [{
      startFrame: 0,
      endFrame: 48,
      text: "Teste real de renderização do Lemo-Opuscar",
      visualCue: "Composição vetorial animada",
    }],
    subtitleEntries: [{
      start: 0,
      end: 1.8,
      text: "Renderizador Lemo validado sem publicar",
    }],
    totalDuration: 2,
    fps: 24,
    imageUrl: "",
    productImages: [],
  }, outputPath, audioPath);

  assert.ok(fs.existsSync(outputPath), "Lemo-Opuscar deve produzir um MP4");
  assert.ok(fs.statSync(outputPath).size > 10_000, "MP4 de saída deve conter dados");

  const probe = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,width,height",
    "-of", "json",
    outputPath,
  ], { encoding: "utf8" });
  const streams = JSON.parse(probe).streams || [];
  assert.ok(streams.some((stream) => stream.codec_type === "video" && stream.width === 1080 && stream.height === 1920),
    "saída deve ser vertical 1080x1920");
  assert.ok(streams.some((stream) => stream.codec_type === "audio"),
    "saída deve conter áudio muxado");

  console.log("[lemo-opuscar-smoke] OK: MP4 1080x1920 renderizado pelo core oficial, com áudio, sem upload/publicação.");
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
