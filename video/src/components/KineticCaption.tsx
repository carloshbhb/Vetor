import React from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';
import { selectCaptionWindow } from '../utils/caption-window';
import { SHORTS_CAPTION_BAND } from '../utils/shorts-safe-zone';

export type CaptionWord = { text: string; start: number; end: number };

type KineticCaptionProps = {
  text: string;
  progress: number;
  opacity: number;
  variant?: 'portrait' | 'landscape';
  /** Real per-word timings (seconds) from the TTS. When present the highlight follows the spoken word. */
  words?: CaptionWord[];
  /** Current video time in seconds; required together with `words`. */
  time?: number;
  fps?: number;
  /**
   * Renders a rolling window of at most this many words inside a fixed-height
   * band. Without it the legacy full-cue behavior is preserved (ComparisonVideo).
   */
  maxVisibleWords?: number;
};

const HIGHLIGHT = '#FFD43B';
const LANDSCAPE_BAND_HEIGHT = 104;
const OUTLINE =
  '0 0 0 #000, 3px 0 0 #050912, -3px 0 0 #050912, 0 3px 0 #050912, 0 -3px 0 #050912, 2px 2px 0 #050912, -2px 2px 0 #050912, 2px -2px 0 #050912, -2px -2px 0 #050912, 0 6px 14px rgba(0,0,0,.55)';

/**
 * URLs and model codes are single tokens. Insert zero-width break opportunities after
 * punctuation so the browser wraps at `/`, `.` or `-` instead of splitting a word in half.
 * `overflow-wrap: break-word` still handles tokens that have no punctuation at all.
 */
const withBreakOpportunities = (word: string) =>
  word.replace(/([/._\-?&=#])/g, '$1\u200B');

/**
 * Word-highlight captions.
 *
 * Portrait (Shorts): large outlined text on a soft dark panel inside a fixed band
 * (1236..1486) below the media stage, so a long cue can never grow into the image.
 * With `maxVisibleWords` the cue becomes a rolling window of stable height; the word
 * being spoken pops in yellow. Without it the legacy full-cue panel is kept.
 */
export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  progress,
  opacity,
  variant = 'portrait',
  words: timedWords,
  time,
  fps = 30,
  maxVisibleWords,
}) => {
  const { height: compositionHeight } = useVideoConfig();
  const landscape = variant === 'landscape';
  const timed = Boolean(timedWords && timedWords.length && typeof time === 'number');
  const allTokens = timed
    ? (timedWords as CaptionWord[]).map((word) => word.text)
    : text.trim().split(/\s+/).filter(Boolean);

  let activeIndex: number;
  if (timed) {
    const now = time as number;
    const list = timedWords as CaptionWord[];
    activeIndex = -1;
    for (let index = 0; index < list.length; index += 1) {
      if (now >= list[index].start) activeIndex = index;
    }
  } else {
    activeIndex = Math.min(
      Math.max(0, allTokens.length - 1),
      Math.floor(interpolate(progress, [0, 1], [0, allTokens.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })),
    );
  }

  const windowed = Boolean(maxVisibleWords && maxVisibleWords > 0);
  const { start, end } = windowed
    ? selectCaptionWindow(allTokens.length, activeIndex, maxVisibleWords as number)
    : { start: 0, end: allTokens.length };
  const tokens = windowed ? allTokens.slice(start, end) : allTokens;
  const activeVisibleIndex = activeIndex - start;

  const windowChars = tokens.reduce((total, token) => total + token.length + 1, 0);
  const fontSize = windowed
    ? landscape
      ? windowChars > 64 ? 28 : 34
      : windowChars > 44 ? 44 : windowChars > 30 ? 50 : 54
    : landscape
      ? tokens.length > 12 ? 29 : 34
      : tokens.length > 8 ? 50 : 56;

  let chunkOpacity = 1;
  if (windowed) {
    if (timed && activeIndex >= 0) {
      const chunkStart = (timedWords as CaptionWord[])[start].start;
      chunkOpacity = interpolate(((time as number) - chunkStart) * fps, [0, 3], [0.35, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else {
      // Without word timings, approximate the age of the chunk from cue progress.
      const chunkAge = progress * Math.max(1, allTokens.length) - start;
      chunkOpacity = interpolate(chunkAge, [0, 0.5], [0.35, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  const bandHeight = landscape ? LANDSCAPE_BAND_HEIGHT : SHORTS_CAPTION_BAND.height;
  const bandBottom = landscape ? 105 : compositionHeight - SHORTS_CAPTION_BAND.bottom;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: windowed ? bandBottom : landscape ? 105 : 420,
        height: windowed ? bandHeight : undefined,
        left: landscape ? 135 : 70,
        right: landscape ? 390 : 170,
        zIndex: 100,
        opacity: opacity * chunkOpacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: windowed ? 'center' : undefined,
        minWidth: 0,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: landscape ? 'rgba(7, 12, 24, 0.95)' : 'rgba(5, 9, 18, 0.62)',
          border: landscape ? '2px solid rgba(66, 133, 244, 0.9)' : 'none',
          borderRadius: landscape ? 18 : 30,
          padding: landscape ? '14px 22px' : '20px 28px 24px',
          width: '100%',
          height: windowed ? '100%' : undefined,
          maxWidth: landscape ? 1160 : 840,
          minWidth: 0,
          boxSizing: 'border-box',
          display: windowed ? 'flex' : undefined,
          alignItems: windowed ? 'center' : undefined,
          justifyContent: windowed ? 'center' : undefined,
          textAlign: 'center',
          overflowWrap: 'break-word',
          wordBreak: 'normal',
          boxShadow: landscape ? '0 12px 38px rgba(0,0,0,0.48), 0 0 24px rgba(37,99,235,0.20)' : '0 18px 50px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            minWidth: 0,
            columnGap: landscape ? 8 : 20,
            rowGap: landscape ? 5 : 8,
            fontSize,
            fontWeight: landscape ? 850 : 900,
            color: theme.text,
            fontFamily: fonts.body,
            lineHeight: windowed ? 1.12 : 1.16,
            letterSpacing: landscape ? 0 : -1,
            overflowWrap: 'break-word',
            wordBreak: 'normal',
            textShadow: landscape ? '0 2px 8px rgba(0,0,0,0.65)' : OUTLINE,
          }}
        >
          {tokens.map((word, index) => {
            const tokenIndex = start + index;
            const isActive = index === activeVisibleIndex;
            const isPast = index < activeVisibleIndex;
            let pop = 1;
            if (isActive && timed && !landscape) {
              const startedAgo = ((time as number) - (timedWords as CaptionWord[])[tokenIndex].start) * fps;
              pop = interpolate(startedAgo, [0, 3, 8], [1, 1.08, 1.04], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
            } else if (isActive) {
              pop = 1.04;
            }
            // A long unbreakable token (URL, model code) fills the whole caption width.
            // Scaling it would push the text past the safe-zone edge, so keep it at 1.
            if (word.length > 32) pop = 1;
            if (landscape) {
              return (
                <span
                  key={tokenIndex}
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflowWrap: 'break-word',
                    wordBreak: 'normal',
                    whiteSpace: 'normal',
                    color: isActive ? '#FFFFFF' : isPast ? '#BFDBFE' : '#E5E7EB',
                    background: isActive ? '#2563EB' : 'transparent',
                    borderRadius: 7,
                    padding: isActive ? '1px 5px' : '1px 0',
                    transform: `scale(${pop})`,
                    transformOrigin: 'center',
                  }}
                >
                  {withBreakOpportunities(word)}
                </span>
              );
            }
            return (
              <span
                key={tokenIndex}
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  whiteSpace: 'normal',
                  color: isActive ? HIGHLIGHT : '#FFFFFF',
                  transform: `scale(${pop})`,
                  transformOrigin: 'center bottom',
                }}
              >
                {withBreakOpportunities(word)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
