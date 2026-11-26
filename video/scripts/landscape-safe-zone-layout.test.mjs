import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANDSCAPE_BROLL_RECT,
  LANDSCAPE_CAMERA,
  LANDSCAPE_CANVAS,
  LANDSCAPE_CAPTION_BAND,
  LANDSCAPE_END_PRODUCT_BOX,
  LANDSCAPE_OPENING_PRODUCT_BOX,
  LANDSCAPE_PRODUCT_BOX,
  LANDSCAPE_SAFE_ZONE,
  LANDSCAPE_OVERLAY_SAFE_ZONE,
  LANDSCAPE_SCENE_FOOTER,
  LANDSCAPE_TEXT_COLUMN,
  expandLandscapeRect,
  isInsideLandscapeSafeZone,
  landscapeCameraAt,
  landscapeCameraMinSpeedPerFrame,
  landscapeCameraWorstCaseRect,
  landscapeProductMotionRect,
} from '../src/utils/landscape-safe-zone.ts';

const MOTIONS = ['push-in', 'pan-left', 'pan-right', 'tilt-left', 'tilt-right', 'float'];

/**
 * Regression for the production failure of queue item 4ec529a2: the b-roll
 * card was an AbsoluteFill, so `right: 360` was ignored and the card ran off
 * the canvas into YouTube's 300px end-screen band. These assertions describe
 * the real layout used by EditorialReviewLandscape, not a parallel copy.
 */

test('safe zone matches remotion-qa yt-landscape insets', () => {
  assert.deepEqual(LANDSCAPE_SAFE_ZONE, { left: 60, top: 120, right: 1620, bottom: 1020 });
  assert.equal(LANDSCAPE_SAFE_ZONE.left, 60);
  assert.equal(LANDSCAPE_SAFE_ZONE.top, 120);
  assert.equal(LANDSCAPE_SAFE_ZONE.right, LANDSCAPE_CANVAS.width - 300);
  assert.equal(LANDSCAPE_SAFE_ZONE.bottom, LANDSCAPE_CANVAS.height - 60);
});

test('motion-graphics clip remains inside the platform safe zone at both camera extremes', () => {
  assert.deepEqual(LANDSCAPE_OVERLAY_SAFE_ZONE, {
    left: 92,
    top: 142,
    right: 1588,
    bottom: 998,
  });
  assert.ok(LANDSCAPE_OVERLAY_SAFE_ZONE.left - LANDSCAPE_CAMERA.xAmplitude >= LANDSCAPE_SAFE_ZONE.left);
  assert.ok(LANDSCAPE_OVERLAY_SAFE_ZONE.right + LANDSCAPE_CAMERA.xAmplitude <= LANDSCAPE_SAFE_ZONE.right);
  assert.ok(LANDSCAPE_OVERLAY_SAFE_ZONE.top - LANDSCAPE_CAMERA.yAmplitude >= LANDSCAPE_SAFE_ZONE.top);
  assert.ok(LANDSCAPE_OVERLAY_SAFE_ZONE.bottom + LANDSCAPE_CAMERA.yAmplitude <= LANDSCAPE_SAFE_ZONE.bottom);
});

test('b-roll card stays inside the safe zone at both camera extremes', () => {
  assert.equal(LANDSCAPE_BROLL_RECT.left, 1010);
  assert.equal(LANDSCAPE_BROLL_RECT.right, 1560);
  assert.equal(LANDSCAPE_BROLL_RECT.top, 205);
  assert.equal(LANDSCAPE_BROLL_RECT.bottom, 790);
  assert.equal(isInsideLandscapeSafeZone(landscapeCameraWorstCaseRect(LANDSCAPE_BROLL_RECT)), true);
});

test('scene product never crosses the safe zone for any motion preset', () => {
  for (const motion of MOTIONS) {
    const rect = landscapeCameraWorstCaseRect(landscapeProductMotionRect(LANDSCAPE_PRODUCT_BOX, motion));
    assert.equal(
      isInsideLandscapeSafeZone(rect),
      true,
      `${motion} would leave the safe zone: ${JSON.stringify(rect)}`,
    );
  }
});

test('opening and closing product cards stay inside the safe zone', () => {
  const opening = landscapeCameraWorstCaseRect(landscapeProductMotionRect(LANDSCAPE_OPENING_PRODUCT_BOX));
  const closing = landscapeCameraWorstCaseRect(landscapeProductMotionRect(LANDSCAPE_END_PRODUCT_BOX));
  assert.equal(isInsideLandscapeSafeZone(opening), true, JSON.stringify(opening));
  assert.equal(isInsideLandscapeSafeZone(closing), true, JSON.stringify(closing));
});

test('heading column never reaches the left or right reserved bands', () => {
  const rect = landscapeCameraWorstCaseRect({
    left: LANDSCAPE_TEXT_COLUMN.left,
    top: 160,
    right: LANDSCAPE_TEXT_COLUMN.left + LANDSCAPE_TEXT_COLUMN.width,
    bottom: 700,
  });
  assert.equal(isInsideLandscapeSafeZone(rect), true, JSON.stringify(rect));
});

test('caption band is static, inside the safe zone and above the bottom UI band', () => {
  const top = LANDSCAPE_CANVAS.height - LANDSCAPE_CAPTION_BAND.bottom - LANDSCAPE_CAPTION_BAND.height;
  const rect = {
    left: LANDSCAPE_CAPTION_BAND.left,
    right: LANDSCAPE_CANVAS.width - LANDSCAPE_CAPTION_BAND.right,
    top,
    bottom: top + LANDSCAPE_CAPTION_BAND.height,
  };
  // The captions are rendered outside the camera layer, so no excursion applies.
  assert.equal(isInsideLandscapeSafeZone(rect), true, JSON.stringify(rect));
  assert.equal(rect.bottom, 990);
  assert.ok(rect.bottom < LANDSCAPE_SAFE_ZONE.bottom);
});

test('scene footer stays above the caption band at maximum downward camera', () => {
  const captionTop = LANDSCAPE_CANVAS.height - LANDSCAPE_CAPTION_BAND.bottom - LANDSCAPE_CAPTION_BAND.height;
  const footer = expandLandscapeRect(
    {
      left: LANDSCAPE_SCENE_FOOTER.left,
      right: LANDSCAPE_CANVAS.width - LANDSCAPE_SCENE_FOOTER.right,
      top:
        LANDSCAPE_CANVAS.height -
        LANDSCAPE_SCENE_FOOTER.accentBottom -
        LANDSCAPE_SCENE_FOOTER.accentHeight,
      bottom: LANDSCAPE_CANVAS.height - LANDSCAPE_SCENE_FOOTER.accentBottom,
    },
    LANDSCAPE_CAMERA.xAmplitude,
    LANDSCAPE_CAMERA.yAmplitude,
  );
  assert.ok(footer.bottom < captionTop, `footer ${footer.bottom} overlaps captions at ${captionTop}`);
});

test('camera is continuous and never slower than 1px per frame at 30fps', () => {
  const fps = 30;
  const minSpeed = landscapeCameraMinSpeedPerFrame(fps);
  assert.ok(minSpeed >= 1, `design min speed is ${minSpeed.toFixed(3)}px/frame`);

  let previous = landscapeCameraAt(0, fps);
  let observedMin = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let maxY = 0;
  for (let frame = 1; frame <= fps * 20; frame += 1) {
    const next = landscapeCameraAt(frame, fps);
    observedMin = Math.min(observedMin, Math.hypot(next.x - previous.x, next.y - previous.y));
    maxX = Math.max(maxX, Math.abs(next.x));
    maxY = Math.max(maxY, Math.abs(next.y));
    previous = next;
  }

  assert.ok(observedMin >= 1, `observed min speed is ${observedMin.toFixed(3)}px/frame`);
  assert.ok(maxX <= LANDSCAPE_CAMERA.xAmplitude + 1e-9);
  assert.ok(maxY <= LANDSCAPE_CAMERA.yAmplitude + 1e-9);
  assert.equal(landscapeCameraAt(0, fps).x, 0);
});

test('camera excursion helper is symmetric', () => {
  const rect = { left: 100, top: 100, right: 500, bottom: 400 };
  assert.deepEqual(landscapeCameraWorstCaseRect(rect), {
    left: 100 - LANDSCAPE_CAMERA.xAmplitude,
    top: 100 - LANDSCAPE_CAMERA.yAmplitude,
    right: 500 + LANDSCAPE_CAMERA.xAmplitude,
    bottom: 400 + LANDSCAPE_CAMERA.yAmplitude,
  });
});

test('creative overlays are clipped and kinetic headlines are fitted to platform-safe bounds', () => {
  const treatment = readFileSync(new URL('../src/compositions/SceneCreativeTreatment.tsx', import.meta.url), 'utf8');
  const renderer = readFileSync(new URL('../src/motion-graphics/SceneMotionGraphicsRenderer.tsx', import.meta.url), 'utf8');

  assert.match(treatment, /LANDSCAPE_OVERLAY_SAFE_ZONE/);
  assert.match(treatment, /clipPath: safeOverlay/);
  assert.match(treatment, /const cinematicCircle = landscape[\s\S]*size: height \* 0\.68/);
  assert.match(renderer, /LANDSCAPE_OVERLAY_SAFE_ZONE/);
  assert.match(renderer, /SHORTS_SAFE_ZONE/);
  assert.match(renderer, /fitHeadlineSize\(text/);
  assert.match(renderer, /truncateHeadline\(label/);
  assert.match(renderer, /left: contentLeft/);
  assert.match(renderer, /right: width - contentRight/);
  assert.doesNotMatch(renderer, /fontSize: landscape \\? 88 : 104/);
});

test('the fixed landscape safe-zone clip wraps the complete moving camera layer and captions', () => {
  const composition = readFileSync(new URL('../src/compositions/EditorialReviewLandscape.tsx', import.meta.url), 'utf8');
  const clipWrapper = composition.indexOf('<AbsoluteFill style={{ clipPath: cameraContentClip, overflow: \'hidden\' }}>'); 
  const movingCamera = composition.indexOf('<AbsoluteFill style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0)` }}>'); 
  const captions = composition.indexOf('<LongCaptions entries={props.subtitleEntries}', movingCamera);
  const wrapperClose = composition.indexOf('</AbsoluteFill>', captions);

  assert.ok(clipWrapper >= 0, 'a stationary safe-zone clip must exist outside camera motion');
  assert.ok(movingCamera > clipWrapper, 'the camera-transformed scene must be a child of the fixed clip');
  assert.ok(captions > movingCamera && captions < wrapperClose, 'captions must remain inside the fixed safe-zone clip');
  assert.match(composition, /const safeZoneGuard = 4/);
  assert.match(composition, /LANDSCAPE_SAFE_ZONE\.top \+ safeZoneGuard/);
  assert.match(composition, /width - LANDSCAPE_SAFE_ZONE\.right \+ safeZoneGuard/);
  assert.match(composition, /height - LANDSCAPE_SAFE_ZONE\.bottom \+ safeZoneGuard/);
  assert.match(composition, /LANDSCAPE_SAFE_ZONE\.left \+ safeZoneGuard/);

  const clipBounds = {
    left: LANDSCAPE_SAFE_ZONE.left + 4,
    top: LANDSCAPE_SAFE_ZONE.top + 4,
    right: LANDSCAPE_SAFE_ZONE.right - 4,
    bottom: LANDSCAPE_SAFE_ZONE.bottom - 4,
  };
  assert.ok(isInsideLandscapeSafeZone(clipBounds), 'the global clipping rectangle must be strictly inside the YouTube safe zone');
});
