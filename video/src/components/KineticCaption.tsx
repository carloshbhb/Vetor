import React from 'react';
import { interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

type KineticCaptionProps = {
  text: string;
  progress: number;
  opacity: number;
};

/**
 * Word-highlight captions with a YouTube Shorts safe-zone layout.
 * Timing is derived from the same narration segments that feed Edge TTS.
 */
export const KineticCaption: React.FC<KineticCaptionProps> = ({ text, progress, opacity }) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const fontSize = words.length > 8 ? 38 : 42;
  const activeIndex = Math.min(
    Math.max(0, words.length - 1),
    Math.floor(interpolate(progress, [0, 1], [0, words.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })),
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 420,
        left: 190,
        right: 190,
        zIndex: 100,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(7, 12, 24, 0.94)',
          border: '2px solid rgba(66, 133, 244, 0.9)',
          borderRadius: 22,
          padding: '18px 24px',
          width: '100%',
          maxWidth: 700,
          textAlign: 'center',
          boxShadow: '0 12px 38px rgba(0,0,0,0.48), 0 0 24px rgba(37,99,235,0.20)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: 9,
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
                  transform: isActive ? 'scale(1.07)' : 'scale(1)',
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
