import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  delay?: number;
  color?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  maxScore = 10,
  delay = 0,
  color = theme.blue,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barProgress = spring({
    fps,
    frame: frame - delay,
    config: { stiffness: 150, damping: 25 },
  });

  const barWidth = interpolate(barProgress, [0, 1], [0, (score / maxScore) * 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: labelOpacity,
        }}
      >
        <span
          style={{
            fontSize: 24,
            color: theme.text,
            fontFamily: fonts.body,
            fontWeight: '500',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 24,
            color: theme.muted,
            fontFamily: fonts.mono,
            fontWeight: 'bold',
          }}
        >
          {score.toFixed(1)}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 16,
          background: theme.surface2,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            background: color,
            borderRadius: 8,
          }}
        />
      </div>
    </div>
  );
};
