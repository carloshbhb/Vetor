import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import {
  buildNarrationTimings,
  buildTimedCaptionEntries,
} from "./video-format.mjs";

const [fixturePath, audioPath, boundariesPath, metadataPath] = process.argv.slice(2);
if (!fixturePath || !audioPath || !boundariesPath || !metadataPath) {
  console.error("usage: validate-tts-alignment.mjs <fixture.json> <audio.mp3> <boundaries.jsonl> <metadata.json>");
  process.exit(2);
}

function units(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const segments = (fixture.segments || []).map((segment) => ({
  kind: String(segment.kind || "scene"),
  text: String(segment.text || "").trim(),
})).filter((segment) => segment.text);
assert.ok(segments.length >= 2, "fixture needs at least two spoken segments");

const boundaries = fs.readFileSync(boundariesPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((item) => item && item.type === "WordBoundary");
assert.ok(boundaries.length >= 20, "Edge TTS returned too few WordBoundary entries");

const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
assert.equal(metadata.rate, "+5%", "Edge TTS rate is not the configured +5%");
assert.ok(fs.statSync(audioPath).size > 1000, "Edge TTS did not produce a valid MP3");

const duration = Number(execFileSync("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration",
  "-of", "default=noprint_wrappers=1:nokey=1",
  audioPath,
], { encoding: "utf8" }).trim());
assert.ok(Number.isFinite(duration) && duration > 10, "invalid narration duration");

const expectedWordCount = segments.reduce(
  (total, segment) => total + segment.text.split(/\s+/).filter(Boolean).length,
  0
);
const expectedUnits = segments.flatMap((segment) => units(segment.text));
const actualUnits = boundaries.flatMap((boundary) => units(boundary.text));
let mismatch = -1;
for (let index = 0; index < Math.max(expectedUnits.length, actualUnits.length); index += 1) {
  if (expectedUnits[index] !== actualUnits[index]) {
    mismatch = index;
    break;
  }
}
assert.equal(
  mismatch,
  -1,
  "script and Edge TTS units diverged at " + mismatch +
    ": expected=" + expectedUnits[mismatch] + " actual=" + actualUnits[mismatch]
);
assert.equal(expectedUnits.length, actualUnits.length, "script and Edge TTS unit counts differ");

const timings = buildNarrationTimings(segments, boundaries, duration);
assert.ok(timings, "strict narration timing rejected real Edge TTS boundaries");
assert.equal(timings.length, segments.length);
assert.equal(timings[0].start, 0, "narration must start at zero");
assert.ok(Math.abs(timings.at(-1).end - duration) < 0.05, "narration must end at the audio duration");
assert.ok(timings.every((timing, index) => index === 0 || timing.start === timings[index - 1].end), "narration segments must tile without gaps");

const captions = buildTimedCaptionEntries(segments, boundaries, { maxWords: 10, maxLineChars: 34 });
assert.ok(captions && captions.length >= 3, "strict timed captions rejected real Edge TTS boundaries");
const captionWords = captions.flatMap((cue) => cue.words || []);
assert.equal(captionWords.length, expectedWordCount, "captions dropped spoken words");
assert.ok(captionWords.every((word) => word.end > word.start), "captions contain non-positive word durations");
assert.ok(captionWords.every((word) => word.start >= 0 && word.end <= duration + 0.05), "caption word outside audio range");
assert.ok(captions.every((cue) => cue.end > cue.start), "captions contain non-positive cue durations");
assert.ok(captions.every((cue) => cue.start >= 0 && cue.end <= duration + 0.05), "caption cue outside audio range");

const longestLine = Math.max(...captions.flatMap((cue) => cue.text.split("\n").map((line) => line.length)));
assert.ok(longestLine <= 34, "Shorts caption line exceeds 34 characters: " + longestLine);

console.log(JSON.stringify({
  rate: metadata.rate,
  duration: Number(duration.toFixed(2)),
  segments: segments.length,
  boundaries: boundaries.length,
  units: expectedUnits.length,
  cueCount: captions.length,
  longestLine,
  exact: true,
}, null, 2));
