/**
 * Shared YouTube Shorts safe-zone geometry (1080x1920).
 * The visible content rectangle excludes the platform overlays:
 * left 60px, right 160px, top 220px, bottom 280px.
 *
 * The composition is split into fixed vertical bands so text and media can
 * never grow into each other:
 *
 *   header   220..480   (eyebrow + headline)
 *   stage    500..1200  (product, B-roll and macro shots)
 *   captions 1236..1486 (fixed-height rolling window)
 *   accent   1511..1515
 *   progress 1528..1560
 *   safe end 1640
 */
export const SHORTS_SAFE_ZONE = {
  left: 60,
  top: 220,
  right: 920,
  bottom: 1640,
} as const;

export const SHORTS_HEADER_BAND = {
  top: 220,
  bottom: 480,
} as const;

/** Global-canvas position used by the editorial review composition. */
export const SHORTS_STAGE = {
  left: 120,
  top: 500,
  width: 740,
  height: 700,
} as const;

export const SHORTS_CAPTION_BAND = {
  top: 1236,
  bottom: 1486,
  height: 250,
} as const;

export const SHORTS_ACCENT_BAND = {
  top: 1511,
  height: 4,
} as const;

export const SHORTS_PROGRESS_BAND = {
  top: 1528,
  bottom: 1560,
} as const;

/**
 * GradientBackground adds 60px of padding before its child coordinate system.
 * These local coordinates therefore place the comparison B-roll at exactly the
 * same safe global-canvas rectangle as SHORTS_STAGE.
 */
const GRADIENT_BACKGROUND_INSET = 60;
export const COMPARISON_BROLL_STAGE = {
  left: SHORTS_STAGE.left - GRADIENT_BACKGROUND_INSET,
  top: SHORTS_STAGE.top - GRADIENT_BACKGROUND_INSET,
  width: SHORTS_STAGE.width,
  height: SHORTS_STAGE.height,
} as const;

export function isInsideShortsSafeZone(
  rect: { left: number; top: number; width: number; height: number },
  parentOffset = { left: 0, top: 0 },
): boolean {
  const left = rect.left + parentOffset.left;
  const top = rect.top + parentOffset.top;
  const right = left + rect.width;
  const bottom = top + rect.height;

  return (
    left >= SHORTS_SAFE_ZONE.left &&
    top >= SHORTS_SAFE_ZONE.top &&
    right <= SHORTS_SAFE_ZONE.right &&
    bottom <= SHORTS_SAFE_ZONE.bottom
  );
}
