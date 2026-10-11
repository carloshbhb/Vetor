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
 * Caption treatment adapted from Remotion's official popping-word / word-highlight
 * caption examples. Timing is derived from the existing subtitle cue, so no new
 * transcription service or external runtime dependency is required.
 */
export const KineticCaption: React.FC<KineticCaptionProps> = ({ text, progress, opacity }) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const activeIndex = Math.min(
    Math.max(0, words.length - 1),
    Math.floor(interpolate(progress, [0, 1], [0, words.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })),
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: 132,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      opacity,
      width: '88%',
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(7, 12, 24, 0.92)',
        border: '2px solid rgba(66, 133, 244, 0.8)',
        borderRadius: 22,
        padding: '20px 28px',
        maxWidth: '100%',
        textAlign: 'center',
        boxShadow: '0 12px 38px rgba(0,0,0,0.48), 0 0 24px rgba(37,99,235,0.18)',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 10,
          rowGap: 5,
          fontSize: 34,
          fontWeight: 800,
          color: theme.text,
          fontFamily: fonts.heading,
          lineHeight: 1.25,
          textShadow: '0 2px 8px rgba(0,0,0,0.65)',
        }}>
          {words.map((word, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            const scale = isActive ? 1.08 : 1;
            return (
              <span key={index} style={{
                display: 'inline-block',
                color: isActive ? '#FFFFFF' : isPast ? '#BFDBFE' : '#E5E7EB',
                background: isActive ? '#2563EB' : 'transparent',
                borderRadius: 7,
                padding: isActive ? '1px 5px' : '1px 0',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
                opacity: isPast ? 0.94 : 1,
              }}>{word}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
