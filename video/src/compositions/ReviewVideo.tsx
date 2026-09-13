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
import { ScoreBar } from '../components/ScoreBar';

interface ReviewVideoProps {
  title: string;
  imageUrl: string;
  score: number;
  pros: string[];
  cons: string[];
  verdict: string;
  category: string;
}

const Scene1: React.FC<{ title: string; imageUrl: string; category: string }> = ({
  title,
  imageUrl,
  category,
}) => {
  const frame = useCurrentFrame();

  const imageOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const imageScale = interpolate(frame, [0, 25], [0.8, 1], {
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
          width: '100%',
        }}
      >
        <div
          style={{
            opacity: imageOpacity,
            transform: `scale(${imageScale})`,
            background: theme.surface,
            borderRadius: 32,
            padding: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: 500,
              height: 500,
              objectFit: 'contain',
              borderRadius: 24,
            }}
          />
        </div>
        <AnimatedText text={title} fontSize={48} delay={15} maxWidth={900} />
        <AnimatedText
          text={category}
          fontSize={28}
          color={theme.muted}
          delay={25}
          fontWeight="normal"
        />
      </div>
    </GradientBackground>
  );
};

const Scene2: React.FC<{ score: number }> = ({ score }) => {
  const frame = useCurrentFrame();

  const scoreColor =
    score >= 9 ? theme.green : score >= 7 ? theme.blue : score >= 5 ? theme.yellow : theme.red;

  const scale = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const numberValue = interpolate(frame, [10, 60], [0, score], {
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
        <AnimatedText text="NOTA FINAL" fontSize={36} color={theme.muted} />
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: `6px solid ${scoreColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${scale})`,
            background: theme.surface,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 'bold',
              color: scoreColor,
              fontFamily: fonts.mono,
            }}
          >
            {numberValue.toFixed(1)}
          </span>
        </div>
        <AnimatedText
          text={score >= 8 ? 'Excelente!' : score >= 6 ? 'Bom!' : 'Regular'}
          fontSize={40}
          color={scoreColor}
          delay={40}
        />
      </div>
    </GradientBackground>
  );
};

const Scene3: React.FC<{ pros: string[] }> = ({ pros }) => {
  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          width: '100%',
        }}
      >
        <AnimatedText text="Vantagens" fontSize={44} color={theme.green} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            width: '100%',
            maxWidth: 850,
          }}
        >
          {pros.slice(0, 5).map((pro, index) => (
            <AnimatedText
              key={index}
              text={`✓ ${pro}`}
              fontSize={30}
              color={theme.text}
              delay={15 + index * 12}
              fontWeight="normal"
              textAlign="left"
            />
          ))}
        </div>
      </div>
    </GradientBackground>
  );
};

const Scene4: React.FC<{ cons: string[] }> = ({ cons }) => {
  return (
    <GradientBackground>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          width: '100%',
        }}
      >
        <AnimatedText text="Desvantagens" fontSize={44} color={theme.red} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            width: '100%',
            maxWidth: 850,
          }}
        >
          {cons.slice(0, 5).map((con, index) => (
            <AnimatedText
              key={index}
              text={`✗ ${con}`}
              fontSize={30}
              color={theme.muted}
              delay={15 + index * 12}
              fontWeight="normal"
              textAlign="left"
            />
          ))}
        </div>
      </div>
    </GradientBackground>
  );
};

const Scene5: React.FC<{ verdict: string; title: string }> = ({ verdict, title }) => {
  const frame = useCurrentFrame();

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
          width: '100%',
        }}
      >
        <AnimatedText text="Veredicto" fontSize={44} color={theme.blue} />
        <AnimatedText
          text={verdict}
          fontSize={32}
          delay={10}
          fontWeight="normal"
          maxWidth={850}
          lineHeight={1.5}
        />
        <div
          style={{
            opacity: ctaOpacity,
            marginTop: 40,
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
            Leia a review completa
          </span>
        </div>
        <AnimatedText
          text={title}
          fontSize={24}
          color={theme.muted}
          delay={70}
          fontWeight="normal"
        />
      </div>
    </GradientBackground>
  );
};

export const ReviewVideo: React.FC<ReviewVideoProps> = ({
  title,
  imageUrl,
  score,
  pros,
  cons,
  verdict,
  category,
}) => {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <Scene1 title={title} imageUrl={imageUrl} category={category} />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <Scene2 score={score} />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <Scene3 pros={pros} />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <Scene4 cons={cons} />
      </Sequence>
      <Sequence from={360} durationInFrames={90}>
        <Scene5 verdict={verdict} title={title} />
      </Sequence>
    </AbsoluteFill>
  );
};
