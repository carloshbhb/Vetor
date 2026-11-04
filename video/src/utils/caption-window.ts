export type CaptionWindow = {
  /** First word index rendered in the current caption chunk. */
  start: number;
  /** Exclusive last word index rendered in the current caption chunk. */
  end: number;
};

/**
 * Keeps captions to a fixed number of words so the panel height never grows
 * with the length of the TTS cue. The window advances in stable chunks instead
 * of sliding one word at a time, which would reflow the text on every frame.
 */
export function selectCaptionWindow(
  totalWords: number,
  activeIndex: number,
  maxVisibleWords: number,
): CaptionWindow {
  const total = Math.max(0, Math.floor(totalWords));
  if (total === 0) return { start: 0, end: 0 };

  const limit = Math.max(1, Math.min(total, Math.floor(maxVisibleWords)));
  const anchor = Math.min(Math.max(0, Math.floor(activeIndex)), total - 1);
  let start = Math.floor(anchor / limit) * limit;

  // Avoid a one-word orphan at the end of a cue: pull the window back so the
  // last chunk still has at least three words (or the whole chunk when short).
  if (total - start < Math.min(3, limit)) {
    start = Math.max(0, total - limit);
  }

  return { start, end: Math.min(total, start + limit) };
}
