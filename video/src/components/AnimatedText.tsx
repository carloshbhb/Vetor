import { interpolate, useCurrentFrame } from 'remotion';
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
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 32,
  color = theme.text,
  fontWeight = 'bold',
  delay = 0,
  durationInFrames = 20,
  textAlign = 'center',
  maxWidth,
  style = {},
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [delay, delay + durationInFrames], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        color,
        fontWeight,
        fontFamily: fonts.heading,
        textAlign,
        maxWidth,
        lineHeight: 1.3,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
