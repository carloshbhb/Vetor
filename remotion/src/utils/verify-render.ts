// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Visual Verification Loop
// ─────────────────────────────────────────────────────────────────────────────
// Extracts frames at 10%, 50%, 90% of video duration for visual inspection.
// Run after every render to verify: no black frames, layers intact, text visible.
//
// Usage: npx tsx remotion/src/utils/verify-render.ts <video-path>

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface VerificationResult {
  videoPath: string;
  durationSec: number;
  frames: {
    position: string;
    framePath: string;
    exists: boolean;
    sizeBytes: number;
  }[];
  verdict: "pass" | "fail";
  issues: string[];
}

export function verifyRender(videoPath: string): VerificationResult {
  const outputDir = path.join(path.dirname(videoPath), "verification");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = path.basename(videoPath, path.extname(videoPath));

  // Get video duration via ffprobe
  let durationSec = 0;
  try {
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: "utf-8" }
    );
    durationSec = parseFloat(probe.trim());
  } catch (err) {
    return {
      videoPath,
      durationSec: 0,
      frames: [],
      verdict: "fail",
      issues: [`Failed to probe video: ${err}`],
    };
  }

  // Extract frames at 10%, 50%, 90%
  const positions = [
    { label: "10pct", pct: 0.1 },
    { label: "50pct", pct: 0.5 },
    { label: "90pct", pct: 0.9 },
  ];

  const frames = positions.map(({ label, pct }) => {
    const timestamp = durationSec * pct;
    const framePath = path.join(outputDir, `${baseName}_${label}.jpg`);

    try {
      execSync(
        `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -frames:v 1 -update 1 -q:v 3 "${framePath}"`,
        { encoding: "utf-8", stdio: "pipe" }
      );
    } catch {
      // Frame extraction failed
    }

    const exists = fs.existsSync(framePath);
    const sizeBytes = exists ? fs.statSync(framePath).size : 0;

    return {
      position: `${Math.round(pct * 100)}%`,
      framePath,
      exists,
      sizeBytes,
    };
  });

  // Check for issues
  const issues: string[] = [];

  // Check if all frames exist
  const missingFrames = frames.filter((f) => !f.exists);
  if (missingFrames.length > 0) {
    issues.push(`Missing frames: ${missingFrames.map((f) => f.position).join(", ")}`);
  }

  // Check for suspiciously small frames (could indicate black frames)
  const smallFrames = frames.filter((f) => f.exists && f.sizeBytes < 5000);
  if (smallFrames.length > 0) {
    issues.push(
      `Suspiciously small frames (possible black frames): ${smallFrames
        .map((f) => `${f.position} (${f.sizeBytes} bytes)`)
        .join(", ")}`
    );
  }

  // Check duration is reasonable (at least 5 seconds)
  if (durationSec < 5) {
    issues.push(`Video too short: ${durationSec}s (expected at least 5s)`);
  }

  return {
    videoPath,
    durationSec,
    frames,
    verdict: issues.length === 0 ? "pass" : "fail",
    issues,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const videoPath = args[0];

  if (!videoPath) {
    console.error("Usage: npx tsx remotion/src/utils/verify-render.ts <video-path>");
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    process.exit(1);
  }

  console.log(`[Verify] Analyzing: ${videoPath}`);
  const result = verifyRender(videoPath);

  console.log(`\n[Verify] Duration: ${result.durationSec}s`);
  console.log("[Verify] Frames:");
  result.frames.forEach((f) => {
    const status = f.exists ? "OK" : "MISSING";
    console.log(`  ${f.position}: ${status} (${f.sizeBytes} bytes) - ${f.framePath}`);
  });

  console.log(`\n[Verify] Verdict: ${result.verdict.toUpperCase()}`);

  if (result.issues.length > 0) {
    console.log("[Verify] Issues:");
    result.issues.forEach((issue) => console.log(`  - ${issue}`));
  }

  process.exit(result.verdict === "pass" ? 0 : 1);
}

main();
