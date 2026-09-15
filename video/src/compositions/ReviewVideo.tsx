import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  Img,
  Video,
  Audio,
  useVideoConfig,
  spring,
} from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';
import { GradientBackground } from '../components/GradientBackground';
import { AnimatedText } from '../components/AnimatedText';
import { ScoreBar } from '../components/ScoreBar';

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export interface VideoScene {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
  brollKeywords: string[];
  startFrame: number;
  endFrame: number;
}

interface ReviewVideoProps {
  title: string;
  imageUrl: string;
  score: number;
  category: string;
  hook: string;
  scenes: VideoScene[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: SubtitleEntry[];
  productImages?: string[];
  brollVideos?: string[];
  totalDuration: number;
  fps: number;
}

const HookScene: React.FC<{ hook: string; productImage: string }> = ({ hook, productImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hookFrames = 3 * fps;
  const progress = frame / hookFrames;

  const scale = interpolate(progress, [0, 0.3, 1], [1.2, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textOpacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <div
          style={{
            opacity,
            transform: `scale(${scale})`,
            background: theme.surface,
            borderRadius: 32,
            padding: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 80px ${theme.blue}40`,
          }}
        >
          <Img
            src={productImage}
            style={{
              width: 400,
              height: 400,
              objectFit: 'contain',
              borderRadius: 24,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
            }}
          />
        </div>
        <AnimatedText
          text={hook}
          fontSize={52}
          color={theme.text}
          delay={0}
          maxWidth={900}
          style={{ opacity: textOpacity, textShadow: `0 4px 20px ${theme.bg}` }}
        />
      </div>
    </GradientBackground>
  );
};

const ContentScene: React.FC<{
  scene: VideoScene;
  currentFrame: number;
  productImage: string;
  brollVideos: string[];
  sceneIndex: number;
}> = ({ scene, currentFrame, productImage, brollVideos, sceneIndex }) => {
  const { fps } = useVideoConfig();
  const frameInScene = currentFrame - scene.startFrame;
  const progress = frameInScene / (scene.duration * fps);

  const useBroll = brollVideos.length > 0 && progress > 0.3 && progress < 0.9;
  const brollIndex = (sceneIndex + Math.floor(progress * 2)) % brollVideos.length;

  const productOpacity = useBroll
    ? interpolate(progress, [0.2, 0.4, 0.8, 1], [1, 0.3, 0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  const brollOpacity = useBroll
    ? interpolate(progress, [0.2, 0.4, 0.8, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const textProgress = spring({
    fps,
    frame: frameInScene,
    config: { stiffness: 120, damping: 20 },
  });

  const textOpacity = interpolate(textProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <GradientBackground>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
            {brollVideos.length > 0 && (
              <Video
                src={brollVideos[brollIndex]}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: brollOpacity,
                  filter: 'brightness(0.4) blur(1px)',
                }}
                muted
                loop
              />
            )}
          </div>

        <div
          style={{
            opacity: productOpacity,
            transform: `scale(${interpolate(progress, [0, 0.1, 1], [0.8, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            zIndex: 1,
            background: theme.surface,
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            border: `1px solid ${theme.border}`,
          }}
        >
          <Img
            src={productImage}
            style={{
              width: 350,
              height: 350,
              objectFit: 'contain',
              borderRadius: 16,
            }}
          />
        </div>

        <div style={{ zIndex: 2, maxWidth: 900, textAlign: 'center', padding: '0 40px' }}>
          <AnimatedText
            text={scene.text}
            fontSize={38}
            color={theme.text}
            delay={0}
            maxWidth={900}
            lineHeight={1.4}
            style={{ opacity: textOpacity }}
          />
        </div>
      </div>
    </GradientBackground>
  );
};

const ScoreScene: React.FC<{ score: number; productImage: string }> = ({ score, productImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrames = 4 * fps;
  const progress = frame / sceneFrames;

  const scoreColor = score >= 9 ? theme.green : score >= 7 ? theme.blue : score >= 5 ? theme.yellow : theme.red;

  const scale = interpolate(progress, [0, 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const numberValue = interpolate(progress, [0.1, 0.6], [0, score], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <GradientBackground>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, height: '100%' }}>
        <AnimatedText text="NOTA FINAL" fontSize={36} color={theme.muted} />
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: `8px solid ${scoreColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${scale})`,
            background: theme.surface,
            boxShadow: `0 0 60px ${scoreColor}60`,
          }}
        >
          <span style={{ fontSize: 110, fontWeight: 'bold', color: scoreColor, fontFamily: fonts.mono }}>
            {numberValue.toFixed(1)}
          </span>
        </div>
        <AnimatedText
          text={score >= 8 ? 'EXCELENTE!' : score >= 6 ? 'BOM!' : 'REGULAR'}
          fontSize={44}
          color={scoreColor}
          delay={15}
        />
      </div>
    </GradientBackground>
  );
};

const CTAScene: React.FC<{ callToAction: string; title: string; shortenedUrl: string }> = ({ callToAction, title, shortenedUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrames = 4 * fps;
  const progress = frame / sceneFrames;

  const ctaOpacity = interpolate(progress, [0.3, 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOpacity = interpolate(progress, [0.5, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <GradientBackground>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, height: '100%' }}>
        <AnimatedText text="Veredicto Final" fontSize={44} color={theme.blue} />
        <div style={{ opacity: ctaOpacity, marginTop: 20, background: theme.blue, borderRadius: 20, padding: '24px 70px', boxShadow: `0 10px 40px ${theme.blue}60` }}>
          <span style={{ fontSize: 32, fontWeight: 'bold', color: theme.text, fontFamily: fonts.heading }}>
            {callToAction}
          </span>
        </div>
        <AnimatedText text={shortenedUrl} fontSize={28} color={theme.green} delay={25} style={{ opacity: urlOpacity, fontFamily: fonts.mono, background: theme.surface, padding: '12px 24px', borderRadius: 12, border: `1px solid ${theme.green}40` }} />
        <AnimatedText text={title} fontSize={24} color={theme.muted} delay={35} style={{ opacity: urlOpacity }} />
      </div>
    </GradientBackground>
  );
};

const SubtitleOverlay: React.FC<{ subtitles: SubtitleEntry[]; currentFrame: number; fps: number }> = ({ subtitles, currentFrame, fps }) => {
  const currentTime = currentFrame / fps;
  const activeSubtitle = subtitles.find(s => currentTime >= s.start && currentTime < s.end);

  if (!activeSubtitle) return null;

  const progress = (currentTime - activeSubtitle.start) / (activeSubtitle.end - activeSubtitle.start);
  const opacity = progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        opacity,
        transition: 'opacity 0.1s ease',
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: '16px 32px',
          maxWidth: '90%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: `1px solid ${theme.border}`,
        }}
      >
        <span style={{ fontSize: 32, fontWeight: '600', color: theme.text, fontFamily: fonts.body, lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          {activeSubtitle.text}
        </span>
      </div>
    </div>
  );
};

export const ReviewVideo: React.FC<ReviewVideoProps> = ({
  title,
  imageUrl,
  score,
  category,
  hook,
  scenes,
  callToAction,
  audioUrl,
  subtitleEntries,
  productImages = [],
  brollVideos = [],
  totalDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const mainProductImage = productImages[0] || imageUrl;
  const shortenedUrl = `vetor.blog/${title.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}`;

  const hookFrames = 3 * fps;
  const scoreFrames = 4 * fps;
  const ctaFrames = 4 * fps;
  const contentFrames = durationInFrames - hookFrames - scoreFrames - ctaFrames;

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: 'hidden' }}>
      <Audio src={audioUrl} />

      <Sequence from={0} durationInFrames={hookFrames}>
        <HookScene hook={hook} productImage={mainProductImage} />
      </Sequence>

      {scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.endFrame - scene.startFrame}>
          <ContentScene
            scene={scene}
            currentFrame={frame}
            productImage={mainProductImage}
            brollVideos={brollVideos}
            sceneIndex={index}
          />
        </Sequence>
      ))}

      <Sequence from={hookFrames + contentFrames} durationInFrames={scoreFrames}>
        <ScoreScene score={score} productImage={mainProductImage} />
      </Sequence>

      <Sequence from={hookFrames + contentFrames + scoreFrames} durationInFrames={ctaFrames}>
        <CTAScene callToAction={callToAction} title={title} shortenedUrl={shortenedUrl} />
      </Sequence>

      <SubtitleOverlay subtitles={subtitleEntries} currentFrame={frame} fps={fps} />
    </AbsoluteFill>
  );
};