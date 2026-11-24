import assert from "node:assert/strict";
import {
  evaluateVisualSamples,
  buildSceneSampleTimes,
} from "./visual-artifact-qa.mjs";

const makeFrame = (seed) => {
  const pixels = Buffer.alloc(32 * 32);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      pixels[y * 32 + x] = 55 + ((x * 7 + y * 13 + seed * 29 + ((x * y + seed) % 31)) % 175);
    }
  }
  return pixels;
};

const varied = [1, 2, 3, 4, 5, 6].map((seed, index) => ({
  id: index + 1,
  timeSeconds: index * 5,
  frame: makeFrame(seed * seed + seed),
}));
const variedResult = evaluateVisualSamples(varied);
assert.equal(variedResult.ok, true);
assert.equal(variedResult.sampleCount, 6);

const repeatedFrame = makeFrame(7);
const repeated = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  timeSeconds: index * 5,
  frame: Buffer.from(repeatedFrame),
}));
const repeatedResult = evaluateVisualSamples(repeated);
assert.equal(repeatedResult.ok, false);
assert.match(repeatedResult.errors.join(" "), /monótona/);

const repeatedAllowed = evaluateVisualSamples(repeated, { allowRepeatedScenes: true });
assert.equal(repeatedAllowed.ok, true);
assert.match(repeatedAllowed.warnings.join(" "), /permitida/);

const almostBlack = Buffer.alloc(32 * 32, 9);
const darkResult = evaluateVisualSamples([
  { id: "dark", timeSeconds: 10, frame: almostBlack },
]);
assert.equal(darkResult.ok, false);
assert.match(darkResult.errors.join(" "), /subexposta/);
const intentionalLowKey = evaluateVisualSamples([
  { id: "noir-scene", timeSeconds: 10, frame: almostBlack },
], { allowDarkScenes: true });
assert.equal(intentionalLowKey.ok, true);
assert.match(intentionalLowKey.warnings.join(" "), /está escura/);

const times = buildSceneSampleTimes({
  fps: 30,
  scenes: [
    { id: "hook", startFrame: 0, endFrame: 90 },
    { id: 2, startFrame: 90, endFrame: 270 },
    { id: "bad", startFrame: 270, endFrame: 270 },
  ],
});
assert.deepEqual(times, [
  { id: "hook", timeSeconds: 1.5 },
  { id: "2", timeSeconds: 6 },
]);

console.log("[visual-artifact-qa] perceptual diversity, low-light blocking and scene-time extraction passed.");
