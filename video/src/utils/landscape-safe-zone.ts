/**
 * YouTube long-form (1920x1080) safe-zone geometry and scene-camera motion.
 *
 * remotion-qa's `yt-landscape` channel reserves 300px on the right for the
 * end-screen cards, 120px on top and 60px on the left/bottom. Any ink inside
 * those bands fails the production QA gate (`video/scripts/process-video.mjs`),
 * so every card, product shot and text block must stay inside the rectangle
 * below even at the extremes of the camera float.
 *
 * The composition uses one continuous camera for the whole render. Scene
 * progress alone is useless here: a 37s scene at 30fps moves a progress-based
 * animation by less than 0.1px between two frames, which the QA pace check
 * still classifies as dead air. A short-period elliptical float (~1.3px/frame
 * at its slowest point) keeps every frame visibly different without making the
 * edit feel handheld.
 */
import type { SceneMotionPreset } from './visual-storyboard';

export const LANDSCAPE_CANVAS = {
  width: 1920,
  height: 1080,
} as const;

export const LANDSCAPE_SAFE_ZONE = {
  left: 60,
  top: 120,
  right: 1620,
  bottom: 1020,
} as const;

export const LANDSCAPE_CAMERA = {
  xAmplitude: 32,
  yAmplitude: 22,
  periodSeconds: 3.6,
} as const;

export type LandscapeRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * Camera offset for an absolute frame. Both axes use the same phase so the
 * movement is an ellipse: the slowest speed is `min(amplitude) * omega`, and
 * the fastest is `max(amplitude) * omega`. Absolute-frame timing keeps the
 * camera continuous across scene cuts instead of resetting at every Sequence.
 */
export function landscapeCameraAt(frame: number, fps: number): { x: number; y: number } {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const safeFrame = Number.isFinite(frame) ? Math.max(0, frame) : 0;
  const phase = (safeFrame / safeFps) * ((Math.PI * 2) / LANDSCAPE_CAMERA.periodSeconds);
  return {
    x: Math.sin(phase) * LANDSCAPE_CAMERA.xAmplitude,
    y: Math.cos(phase) * LANDSCAPE_CAMERA.yAmplitude,
  };
}

/** Slowest point of the ellipse in px/frame. */
export function landscapeCameraMinSpeedPerFrame(fps: number): number {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const radiansPerSecond = (Math.PI * 2) / LANDSCAPE_CAMERA.periodSeconds;
  return (radiansPerSecond * Math.min(LANDSCAPE_CAMERA.xAmplitude, LANDSCAPE_CAMERA.yAmplitude)) / safeFps;
}

/** B-roll card insets, matching the absolute rectangle used by the composition. */
export const LANDSCAPE_BROLL_BOX = {
  left: 1010,
  top: 205,
  right: 360,
  bottom: 290,
} as const;

export const LANDSCAPE_BROLL_RECT: LandscapeRect = {
  left: LANDSCAPE_BROLL_BOX.left,
  top: LANDSCAPE_BROLL_BOX.top,
  right: LANDSCAPE_CANVAS.width - LANDSCAPE_BROLL_BOX.right,
  bottom: LANDSCAPE_CANVAS.height - LANDSCAPE_BROLL_BOX.bottom,
};

/**
 * Worst-case transform applied by each storyboard motion preset. The
 * composition interpolates between these values, so using the extreme here
 * makes the layout regression test conservative.
 */
export const LANDSCAPE_SCENE_MOTION = {
  panDrift: 20,
  floatDrift: 12,
  tiltDegrees: 1.5,
  pushInMaxScale: 1.14,
  driftMaxScale: 1.08,
} as const;

export type LandscapeProductBox = {
  width: number;
  height: number;
  right: number;
  top: number;
  /** Scale used by the opening/closing cards; scene presets override it. */
  maxScale: number;
};

export const LANDSCAPE_PRODUCT_BOX: LandscapeProductBox = {
  width: 520,
  height: 470,
  right: 400,
  top: 255,
  maxScale: LANDSCAPE_SCENE_MOTION.pushInMaxScale,
};

export const LANDSCAPE_OPENING_PRODUCT_BOX: LandscapeProductBox = {
  width: 500,
  height: 470,
  right: 400,
  top: 200,
  maxScale: 1.06,
};

export const LANDSCAPE_END_PRODUCT_BOX: LandscapeProductBox = {
  width: 500,
  height: 480,
  right: 400,
  top: 210,
  maxScale: 1.06,
};

/**
 * Caption band. It is rendered outside the camera layer so the text stays
 * pixel-stable (readable) while the scene floats behind it.
 */
export const LANDSCAPE_CAPTION_BAND = {
  left: 135,
  right: 390,
  bottom: 90,
  height: 104,
  maxWidth: 1160,
} as const;

/** Heading/body column. The camera may move it but it must not reach the right inset. */
export const LANDSCAPE_TEXT_COLUMN = {
  left: 130,
  width: 790,
} as const;

/** Scene footer (progress bar and accent line), above the caption band. */
export const LANDSCAPE_SCENE_FOOTER = {
  left: 130,
  right: 390,
  progressBottom: 260,
  progressHeight: 3,
  accentBottom: 225,
  accentHeight: 3,
} as const;

export function isInsideLandscapeSafeZone(rect: LandscapeRect): boolean {
  return (
    rect.left >= LANDSCAPE_SAFE_ZONE.left &&
    rect.top >= LANDSCAPE_SAFE_ZONE.top &&
    rect.right <= LANDSCAPE_SAFE_ZONE.right &&
    rect.bottom <= LANDSCAPE_SAFE_ZONE.bottom
  );
}

export function expandLandscapeRect(rect: LandscapeRect, dx: number, dy = dx): LandscapeRect {
  return {
    left: rect.left - dx,
    top: rect.top - dy,
    right: rect.right + dx,
    bottom: rect.bottom + dy,
  };
}

/** Layout bounds plus the full camera excursion. */
export function landscapeCameraWorstCaseRect(rect: LandscapeRect): LandscapeRect {
  return expandLandscapeRect(rect, LANDSCAPE_CAMERA.xAmplitude, LANDSCAPE_CAMERA.yAmplitude);
}

/** Untransformed product rectangle in canvas coordinates. */
export function landscapeProductRect(box: LandscapeProductBox): LandscapeRect {
  const centerX = LANDSCAPE_CANVAS.width - box.right - box.width / 2;
  const centerY = box.top + box.height / 2;
  return {
    left: centerX - box.width / 2,
    top: centerY - box.height / 2,
    right: centerX + box.width / 2,
    bottom: centerY + box.height / 2,
  };
}

function sceneMotionExtremes(motion: SceneMotionPreset): { scale: number; drift: number; tilt: number } {
  switch (motion) {
    case 'push-in':
      return { scale: LANDSCAPE_SCENE_MOTION.pushInMaxScale, drift: 0, tilt: 0 };
    case 'pan-left':
    case 'pan-right':
      return { scale: LANDSCAPE_SCENE_MOTION.driftMaxScale, drift: LANDSCAPE_SCENE_MOTION.panDrift, tilt: 0 };
    case 'tilt-left':
    case 'tilt-right':
      return { scale: LANDSCAPE_SCENE_MOTION.driftMaxScale, drift: 0, tilt: LANDSCAPE_SCENE_MOTION.tiltDegrees };
    case 'float':
      return { scale: LANDSCAPE_SCENE_MOTION.driftMaxScale, drift: LANDSCAPE_SCENE_MOTION.floatDrift, tilt: 0 };
    default:
      return { scale: LANDSCAPE_SCENE_MOTION.driftMaxScale, drift: 0, tilt: 0 };
  }
}

/**
 * Axis-aligned bounds of a product at the worst point of a motion preset:
 * maximum scale, maximum drift and the tilt rotation all at once.
 * Without a motion preset the box's static `maxScale` (opening/closing) is used.
 */
export function landscapeProductMotionRect(
  box: LandscapeProductBox,
  motion?: SceneMotionPreset,
): LandscapeRect {
  const extremes = motion
    ? sceneMotionExtremes(motion)
    : { scale: box.maxScale, drift: 0, tilt: 0 };
  const width = box.width * extremes.scale;
  const height = box.height * extremes.scale;
  const radians = (extremes.tilt * Math.PI) / 180;
  // Rotation grows the axis-aligned bounding box around the same center.
  const boundingWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const boundingHeight = Math.abs(height * Math.cos(radians)) + Math.abs(width * Math.sin(radians));
  const centerX = LANDSCAPE_CANVAS.width - box.right - box.width / 2;
  const centerY = box.top + box.height / 2;

  return {
    left: centerX - boundingWidth / 2 - extremes.drift,
    top: centerY - boundingHeight / 2,
    right: centerX + boundingWidth / 2 + extremes.drift,
    bottom: centerY + boundingHeight / 2,
  };
}
