import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARISON_BROLL_STAGE,
  SHORTS_SAFE_ZONE,
  SHORTS_STAGE,
  isInsideShortsSafeZone,
} from '../src/utils/shorts-safe-zone.ts';

test('editorial review B-roll stays inside the YouTube Shorts safe area', () => {
  assert.equal(isInsideShortsSafeZone(SHORTS_STAGE), true);
  assert.equal(SHORTS_STAGE.left + SHORTS_STAGE.width, 860);
  assert.equal(SHORTS_STAGE.top + SHORTS_STAGE.height, 1240);
});

test('comparison B-roll compensates for GradientBackground padding', () => {
  assert.equal(
    isInsideShortsSafeZone(COMPARISON_BROLL_STAGE, { left: 60, top: 60 }),
    true,
  );
  assert.deepEqual(
    {
      left: COMPARISON_BROLL_STAGE.left + 60,
      top: COMPARISON_BROLL_STAGE.top + 60,
      width: COMPARISON_BROLL_STAGE.width,
      height: COMPARISON_BROLL_STAGE.height,
    },
    SHORTS_STAGE,
  );
});

test('safe area matches Shorts UI insets', () => {
  assert.deepEqual(SHORTS_SAFE_ZONE, {
    left: 60,
    top: 220,
    right: 920,
    bottom: 1640,
  });
});
