import assert from 'node:assert/strict';
import { hasExactTimings, resolveSceneTimings } from '../src/utils/timing.ts';

const fps = 30;
const options = { defaultHookSeconds: 3, tailSeconds: 8 };

// Worker output: scenes tile the real narration; totalDuration is the real audio length.
const exactScenes = [
  { id: 1, duration: 9, startFrame: 60, endFrame: 330 },
  { id: 2, duration: 9, startFrame: 330, endFrame: 700 },
  { id: 3, duration: 9, startFrame: 700, endFrame: 1100 },
];
const exact = resolveSceneTimings({ scenes: exactScenes, totalDuration: 40, hookDuration: 2 }, fps, options);
assert.equal(exact.exact, true);
assert.equal(exact.totalDuration, 40, 'real audio length wins over nominal sum');
assert.equal(exact.hookDuration, 2);
assert.deepEqual(exact.scenes.map((scene) => [scene.startFrame, scene.endFrame]), [[60, 330], [330, 700], [700, 1100]],
  'nominal scene.duration must not overwrite exact frames');

// Without hookDuration it is derived from where the first scene starts speaking.
assert.equal(resolveSceneTimings({ scenes: exactScenes, totalDuration: 40 }, fps, options).hookDuration, 2);

// Samples / manual runs: no exact timing -> nominal durations, as before.
const sampleScenes = [
  { id: 1, duration: 5, startFrame: 0, endFrame: 0 },
  { id: 2, duration: 7, startFrame: 0, endFrame: 0 },
];
const nominal = resolveSceneTimings({ scenes: sampleScenes }, fps, options);
assert.equal(nominal.exact, false);
assert.deepEqual(nominal.scenes.map((scene) => [scene.startFrame, scene.endFrame]), [[90, 240], [240, 450]]);
assert.equal(nominal.totalDuration, (90 + 360 + 240) / 30);
assert.equal(nominal.hookDuration, 3);

// Invalid exact data falls back instead of rendering a broken timeline.
assert.equal(hasExactTimings(exactScenes, 0, fps), false, 'no total duration');
assert.equal(hasExactTimings(exactScenes, 20, fps), false, 'scenes run past the audio');
assert.equal(hasExactTimings([{ duration: 1, startFrame: 10, endFrame: 10 }], 5, fps), false, 'empty scene');
assert.equal(hasExactTimings([
  { duration: 1, startFrame: 0, endFrame: 200 },
  { duration: 1, startFrame: 100, endFrame: 300 },
], 20, fps), false, 'overlapping scenes');
assert.equal(hasExactTimings([], 20, fps), false);
assert.equal(hasExactTimings([{ duration: 1 }], 20, fps), false, 'missing frames');

console.log('timing contract: all assertions passed');
