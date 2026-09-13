import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  Img,
} from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';
import { GradientBackground } from '../components/GradientBackground';
import { AnimatedText } from '../components/AnimatedText';
import { ProductCard } from '../components/ProductCard';
import { ScoreBar } from '../components/ScoreBar';

interface ComparisonVideoProps {
  title: string;
  product1: { name: string; imageUrl: string; score: number };
  product2: { name: string; imageUrl: string; score: number };
  categories: Array<{ label: string; score1: number; score2: number }>;
  winner: 1 | 2;
}

const ComparisonScene1: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();

  const vsScale = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
        }}
      >
        <AnimatedText text={title} fontSize={44} maxWidth={900} />
        <div
          style={{
            transform: `scale(${vsScale})`,
            fontSize: 72,
            fontWeight: 'bold',
            color: theme.blue,
            fontFamily: fonts.heading,
            textShadow: `0 0 40px ${theme.blue}40`,
          }}
        >
          VS
        </div>
      </div>
    </GradientBackground>
  );
};

const ComparisonScene2: React.FC<{
  name: string;
  imageUrl: string;
  score: number;
}> = ({ name, imageUrl, score }) => {
  const frame = useCurrentFrame();

  const slideIn = interpolate(frame, [0, 30], [-200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          opacity,
          transform: `translateX(${slideIn}px)`,
        }}
      >
        <AnimatedText text="Produto 1" fontSize={32} color={theme.muted} />
        <div
          style={{
            background: theme.surface,
            borderRadius: 32,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
            border: `2px solid ${theme.blue}`,
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: 400,
              height: 400,
              objectFit: 'contain',
              borderRadius: 24,
            }}
          />
          <div
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: theme.text,
              fontFamily: fonts.heading,
            }}
          >
            {name}
          </div>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: `4px solid ${theme.blue}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme.surface2,
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: theme.blue,
                fontFamily: fonts.mono,
              }}
            >
              {score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
};

const ComparisonScene3: React.FC<{
  name: string;
  imageUrl: string;
  score: number;
}> = ({ name, imageUrl, score }) => {
  const frame = useCurrentFrame();

  const slideIn = interpolate(frame, [0, 30], [200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          opacity,
          transform: `translateX(${slideIn}px)`,
        }}
      >
        <AnimatedText text="Produto 2" fontSize={32} color={theme.muted} />
        <div
          style={{
            background: theme.surface,
            borderRadius: 32,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
            border: `2px solid ${theme.green}`,
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: 400,
              height: 400,
              objectFit: 'contain',
              borderRadius: 24,
            }}
          />
          <div
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: theme.text,
              fontFamily: fonts.heading,
            }}
          >
            {name}
          </div>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: `4px solid ${theme.green}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme.surface2,
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: theme.green,
                fontFamily: fonts.mono,
              }}
            >
              {score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
};

const ComparisonScene4: React.FC<{
  product1Name: string;
  product2Name: string;
  categories: Array<{ label: string; score1: number; score2: number }>;
}> = ({ product1Name, product2Name, categories }) => {
  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
          padding: '0 40px',
        }}
      >
        <AnimatedText text="Comparação" fontSize={40} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 900,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: theme.blue,
              fontFamily: fonts.heading,
            }}
          >
            {product1Name}
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: theme.green,
              fontFamily: fonts.heading,
            }}
          >
            {product2Name}
          </span>
        </div>
        {categories.map((cat, index) => (
          <div
            key={cat.label}
            style={{
              width: '100%',
              maxWidth: 900,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: theme.muted,
                fontFamily: fonts.body,
                textAlign: 'center',
              }}
            >
              {cat.label}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <ScoreBar
                  label=""
                  score={cat.score1}
                  delay={15 + index * 12}
                  color={theme.blue}
                />
              </div>
              <div style={{ flex: 1 }}>
                <ScoreBar
                  label=""
                  score={cat.score2}
                  delay={20 + index * 12}
                  color={theme.green}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </GradientBackground>
  );
};

const ComparisonScene5: React.FC<{
  winnerName: string;
  winnerScore: number;
  loserName: string;
}> = ({ winnerName, winnerScore, loserName }) => {
  const frame = useCurrentFrame();

  const crownScale = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 36,
        }}
      >
        <AnimatedText text="Vencedor" fontSize={44} color={theme.green} />
        <div
          style={{
            transform: `scale(${crownScale})`,
            fontSize: 80,
          }}
        >
          👑
        </div>
        <AnimatedText text={winnerName} fontSize={52} delay={30} />
        <div
          style={{
            background: theme.surface,
            borderRadius: 24,
            padding: '24px 48px',
            border: `2px solid ${theme.green}`,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: theme.green,
              fontFamily: fonts.mono,
            }}
          >
            {winnerScore.toFixed(1)}
          </span>
        </div>
        <AnimatedText
          text={`vs ${loserName}`}
          fontSize={28}
          color={theme.muted}
          delay={45}
          fontWeight="normal"
        />
        <div
          style={{
            opacity: ctaOpacity,
            marginTop: 20,
            background: theme.blue,
            borderRadius: 16,
            padding: '20px 60px',
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: theme.text,
              fontFamily: fonts.heading,
            }}
          >
            Confira a análise completa
          </span>
        </div>
      </div>
    </GradientBackground>
  );
};

export const ComparisonVideo: React.FC<ComparisonVideoProps> = ({
  title,
  product1,
  product2,
  categories,
  winner,
}) => {
  const winnerProduct = winner === 1 ? product1 : product2;
  const loserProduct = winner === 1 ? product2 : product1;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <ComparisonScene1 title={title} />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <ComparisonScene2
          name={product1.name}
          imageUrl={product1.imageUrl}
          score={product1.score}
        />
      </Sequence>
      <Sequence from={240} durationInFrames={150}>
        <ComparisonScene3
          name={product2.name}
          imageUrl={product2.imageUrl}
          score={product2.score}
        />
      </Sequence>
      <Sequence from={390} durationInFrames={120}>
        <ComparisonScene4
          product1Name={product1.name}
          product2Name={product2.name}
          categories={categories}
        />
      </Sequence>
      <Sequence from={510} durationInFrames={90}>
        <ComparisonScene5
          winnerName={winnerProduct.name}
          winnerScore={winnerProduct.score}
          loserName={loserProduct.name}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
