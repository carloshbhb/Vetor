import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  delay?: number;
  durationInFrames?: number;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
  /** Enable typing animation with stable layout */
  typewriter?: boolean;
  /** Use heading font */
  heading?: boolean;
  /** Use mono font */
  mono?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 32,
  color = theme.text,
  fontWeight = '600',
  delay = 0,
  durationInFrames = 20,
  textAlign = 'center',
  maxWidth,
  lineHeight = 1.35,
  style = {},
  typewriter = false,
  heading = true,
  mono = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    fps,
    frame: frame - delay,
    config: { stiffness: 180, damping: 22 },
  });

  const translateY = spring({
    fps,
    frame: frame - delay,
    config: { stiffness: 200, damping: 25 },
  });

  const opacityClamped = interpolate(opacity, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateYClamped = interpolate(translateY, [0, 0.1, 0.9, 1], [30, 0, 0, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fontFamily = mono ? fonts.mono : heading ? fonts.heading : fonts.body;

  if (typewriter) {
    const visibleChars = Math.floor(
      interpolate(frame, [delay, delay + text.length * 2], [0, text.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    );
    const displayText = text.slice(0, visibleChars);

    return (
      <div style={{ maxWidth, textAlign, lineHeight, fontFamily, fontSize, fontWeight, color, ...style }}>
        <span style={{ visibility: 'hidden', whiteSpace: 'pre-wrap' }}>{text}</span>
        <span style={{ visibility: 'visible', whiteSpace: 'pre-wrap', opacity: opacityClamped, transform: `translateY(${translateYClamped}px)` }}>{displayText}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: opacityClamped,
        transform: `translateY(${translateYClamped}px)`,
        fontSize,
        color,
        fontWeight,
        fontFamily,
        textAlign,
        maxWidth,
        lineHeight,
        letterSpacing: heading ? '-0.02em' : '0',
        ...style,
      }}
    >
      {text}
    </div>
  );
};