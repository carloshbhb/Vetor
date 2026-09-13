import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';
import { ScoreBar } from './ScoreBar';

interface ComparisonChartProps {
  product1Name: string;
  product2Name: string;
  categories: Array<{ label: string; score1: number; score2: number }>;
  delay?: number;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  product1Name,
  product2Name,
  categories,
  delay = 0,
}) => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: headerOpacity,
          padding: '0 20px',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: theme.blue,
            fontFamily: fonts.heading,
            flex: 1,
            textAlign: 'center',
          }}
        >
          {product1Name}
        </div>
        <div
          style={{
            fontSize: 24,
            color: theme.muted,
            fontFamily: fonts.body,
            padding: '0 20px',
          }}
        >
          vs
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: theme.green,
            fontFamily: fonts.heading,
            flex: 1,
            textAlign: 'center',
          }}
        >
          {product2Name}
        </div>
      </div>

      {categories.map((cat, index) => (
        <div
          key={cat.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: theme.muted,
              fontFamily: fonts.body,
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            {cat.label}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <ScoreBar
                label=""
                score={cat.score1}
                delay={delay + 20 + index * 15}
                color={theme.blue}
              />
            </div>
            <div style={{ flex: 1 }}>
              <ScoreBar
                label=""
                score={cat.score2}
                delay={delay + 25 + index * 15}
                color={theme.green}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
