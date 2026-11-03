import React from 'react';
import { interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

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
};

const HIGHLIGHT = '#FFD43B';
const OUTLINE =
  '0 0 0 #000, 3px 0 0 #050912, -3px 0 0 #050912, 0 3px 0 #050912, 0 -3px 0 #050912, 2px 2px 0 #050912, -2px 2px 0 #050912, 2px -2px 0 #050912, -2px -2px 0 #050912, 0 6px 14px rgba(0,0,0,.55)';

/**
 * Word-highlight captions.
 *
 * Portrait (Shorts): large outlined text on a soft dark panel, kept inside the YouTube
 * Shorts safe zone (60px left, 160px right, well above the bottom UI). The word being
 * spoken pops in yellow. With per-word timings the highlight is exact; without them it
 * falls back to a linear estimate over the cue.
 */
export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  progress,
  opacity,
  variant = 'portrait',
  words: timedWords,
  time,
  fps = 30,
}) => {
  const landscape = variant === 'landscape';
  const timed = Boolean(timedWords && timedWords.length && typeof time === 'number');
  const tokens = timed
    ? (timedWords as CaptionWord[]).map((word) => word.text)
    : text.trim().split(/\s+/).filter(Boolean);

  const fontSize = landscape
    ? tokens.length > 12 ? 29 : 34
    : tokens.length > 8 ? 50 : 56;

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
      Math.max(0, tokens.length - 1),
      Math.floor(interpolate(progress, [0, 1], [0, tokens.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })),
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: landscape ? 105 : 420,
        left: landscape ? 135 : 70,
        right: landscape ? 390 : 170,
        zIndex: 100,
        opacity,
        display: 'flex',
        justifyContent: 'center',
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
          maxWidth: landscape ? 1160 : 840,
          textAlign: 'center',
          boxShadow: landscape ? '0 12px 38px rgba(0,0,0,0.48), 0 0 24px rgba(37,99,235,0.20)' : '0 18px 50px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: landscape ? 8 : 20,
            rowGap: landscape ? 5 : 8,
            fontSize,
            fontWeight: landscape ? 850 : 900,
            color: theme.text,
            fontFamily: fonts.body,
            lineHeight: 1.16,
            letterSpacing: landscape ? 0 : -1,
            textShadow: landscape ? '0 2px 8px rgba(0,0,0,0.65)' : OUTLINE,
          }}
        >
          {tokens.map((word, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            let pop = 1;
            if (isActive && timed && !landscape) {
              const startedAgo = ((time as number) - (timedWords as CaptionWord[])[index].start) * fps;
              pop = interpolate(startedAgo, [0, 3, 8], [1, 1.08, 1.04], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
            } else if (isActive) {
              pop = 1.04;
            }
            if (landscape) {
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    color: isActive ? '#FFFFFF' : isPast ? '#BFDBFE' : '#E5E7EB',
                    background: isActive ? '#2563EB' : 'transparent',
                    borderRadius: 7,
                    padding: isActive ? '1px 5px' : '1px 0',
                    transform: `scale(${pop})`,
                    transformOrigin: 'center',
                  }}
                >
                  {word}
                </span>
              );
            }
            return (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  color: isActive ? HIGHLIGHT : '#FFFFFF',
                  transform: `scale(${pop})`,
                  transformOrigin: 'center bottom',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
