import React from 'react';
import { interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

type KineticCaptionProps = {
  text: string;
  progress: number;
  opacity: number;
  variant?: 'portrait' | 'landscape';
  currentTime?: number;
  wordTimings?: Array<{ text: string; start: number; end: number }>;
};

/**
 * Word-highlight captions with platform-specific safe-zone geometry.
 * The same narration timing drives both portrait Shorts and horizontal reviews.
 */
export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  progress,
  opacity,
  variant = 'portrait',
  currentTime,
  wordTimings,
}) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const landscape = variant === 'landscape';
  const fontSize = landscape
    ? words.length > 12 ? 29 : 34
    : words.length > 8 ? 38 : 42;
  const fallbackActiveIndex = Math.min(
    Math.max(0, words.length - 1),
    Math.floor(interpolate(progress, [0, 1], [0, words.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })),
  );
  const hasExactWordTimings = Array.isArray(wordTimings) && wordTimings.length === words.length &&
    wordTimings.every((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
  const activeIndex = hasExactWordTimings && Number.isFinite(currentTime)
    ? (() => {
        const current = wordTimings!.findIndex((item) => currentTime! >= item.start && currentTime! < item.end);
        if (current >= 0) return current;
        const upcoming = wordTimings!.findIndex((item) => currentTime! < item.start);
        return upcoming >= 0 ? upcoming : Math.max(0, words.length - 1);
      })()
    : fallbackActiveIndex;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: landscape ? 105 : 420,
        left: landscape ? 135 : 190,
        right: landscape ? 390 : 190,
        zIndex: 100,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(7, 12, 24, 0.95)',
          border: '2px solid rgba(66, 133, 244, 0.9)',
          borderRadius: landscape ? 18 : 22,
          padding: landscape ? '14px 22px' : '18px 24px',
          width: '100%',
          maxWidth: landscape ? 1160 : 700,
          textAlign: 'center',
          boxShadow: '0 12px 38px rgba(0,0,0,0.48), 0 0 24px rgba(37,99,235,0.20)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: landscape ? 8 : 9,
            rowGap: 5,
            fontSize,
            fontWeight: 850,
            color: theme.text,
            fontFamily: fonts.body,
            lineHeight: 1.22,
            textShadow: '0 2px 8px rgba(0,0,0,0.65)',
          }}
        >
          {words.map((word, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            return (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  color: isActive ? '#FFFFFF' : isPast ? '#BFDBFE' : '#E5E7EB',
                  background: isActive ? '#2563EB' : 'transparent',
                  borderRadius: 7,
                  padding: isActive ? '1px 5px' : '1px 0',
                  transform: isActive ? 'scale(1.06)' : 'scale(1)',
                  transformOrigin: 'center',
                  opacity: isPast ? 0.94 : 1,
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
