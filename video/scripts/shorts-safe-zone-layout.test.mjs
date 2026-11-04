import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARISON_BROLL_STAGE,
  SHORTS_ACCENT_BAND,
  SHORTS_CAPTION_BAND,
  SHORTS_HEADER_BAND,
  SHORTS_PROGRESS_BAND,
  SHORTS_SAFE_ZONE,
  SHORTS_STAGE,
  isInsideShortsSafeZone,
} from '../src/utils/shorts-safe-zone.ts';

test('editorial review stage stays inside the YouTube Shorts safe area', () => {
  assert.equal(isInsideShortsSafeZone(SHORTS_STAGE), true);
  assert.equal(SHORTS_STAGE.left + SHORTS_STAGE.width, 860);
  assert.equal(SHORTS_STAGE.top, 500);
  assert.equal(SHORTS_STAGE.top + SHORTS_STAGE.height, 1200);
});

test('header, stage and caption bands never overlap', () => {
  assert.ok(SHORTS_HEADER_BAND.top >= SHORTS_SAFE_ZONE.top);
  assert.ok(SHORTS_HEADER_BAND.bottom < SHORTS_STAGE.top);
  assert.ok(SHORTS_STAGE.top + SHORTS_STAGE.height < SHORTS_CAPTION_BAND.top);
  assert.equal(SHORTS_CAPTION_BAND.top + SHORTS_CAPTION_BAND.height, SHORTS_CAPTION_BAND.bottom);
});

test('accent and progress sit between the captions and the safe bottom', () => {
  assert.ok(SHORTS_ACCENT_BAND.top > SHORTS_CAPTION_BAND.bottom);
  assert.ok(SHORTS_ACCENT_BAND.top + SHORTS_ACCENT_BAND.height < SHORTS_PROGRESS_BAND.top);
  assert.ok(SHORTS_PROGRESS_BAND.bottom <= SHORTS_SAFE_ZONE.bottom);
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
