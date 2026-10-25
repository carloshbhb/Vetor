import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';

export type EditorialScene = {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
  brollKeywords: string[];
  startFrame: number;
  endFrame: number;
};

export type EditorialSubtitle = {
  start: number;
  end: number;
  text: string;
};

export type EditorialReviewProps = {
  title: string;
  imageUrl: string;
  score: number;
  category: string;
  hook: string;
  scenes: EditorialScene[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: EditorialSubtitle[];
  productImages?: string[];
  brollVideos?: string[];
  totalDuration: number;
  fps: number;
  hookDuration?: number;
};

const colors = {
  ink: '#11141C',
  muted: '#AEB6C4',
  paper: '#F3F4F7',
  orange: '#FF6848',
  blue: '#55B9F2',
};

const font = 'Arial, Helvetica, sans-serif';
const HookFrames = 3;

export const calculateEditorialMetadata: CalculateMetadataFunction<EditorialReviewProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.totalDuration * props.fps)),
});

const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 58%, #253246 0%, #151B29 44%, #0B0E15 100%)',
      color: colors.paper,
      fontFamily: font,
    }}
  >
    <AbsoluteFill
      style={{
        opacity: 0.45,
        background:
          'radial-gradient(circle at 82% 16%, rgba(85,185,242,0.24), transparent 28%), radial-gradient(circle at 12% 72%, rgba(255,104,72,0.16), transparent 30%)',
      }}
    />
    {children}
  </AbsoluteFill>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      color: colors.blue,
      fontSize: 27,
      fontWeight: 800,
      letterSpacing: 5,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const ProductImage: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img
    src={src}
    style={{ width: 1000, height: 600, objectFit: 'contain', ...style }}
  />
);

const OpeningScene: React.FC<{
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
}> = ({ title, category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const rise = interpolate(frame, [0, 18], [38, 0], { extrapolateRight: 'clamp' });

  return (
    <Background>
      <div
        style={{
          position: 'absolute',
          top: 145,
          left: 82,
          right: 82,
          opacity,
          translate: `0px ${rise}px`,
        }}
      >
        <Eyebrow>Vetor • {category}</Eyebrow>
        <div
          style={{
            marginTop: 32,
            fontSize: 76,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: -4,
            overflowWrap: 'anywhere',
          }}
        >
          {hook}
        </div>
      </div>
      <ProductImage
        src={imageUrl}
        style={{
          position: 'absolute',
          left: 40,
          top: 760,
          scale: interpolate(frame, [0, 48], [0.9, 1.03], { extrapolateRight: 'clamp' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: 82,
          right: 82,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: 2,
          color: colors.muted,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <AccentLine />
    </Background>
  );
};

const FeatureScene: React.FC<{
  scene: EditorialScene;
  index: number;
  count: number;
  category: string;
  imageUrl: string;
  brollUrl?: string;
}> = ({ scene, index, count, category, imageUrl, brollUrl }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 22], [70, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const label = (scene.visualCue || category).replace(/[.!?]+$/, '');

  return (
    <Background>
      {brollUrl ? (
        <Video
          src={brollUrl}
          muted
          loop
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.36,
            filter: 'brightness(0.68) blur(1px)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 82,
          right: 82,
          opacity,
          translate: `0px ${enter}px`,
        }}
      >
        <Eyebrow>{label || category}</Eyebrow>
        <div
          style={{
            marginTop: 38,
            fontSize: 56,
            lineHeight: 1.08,
            fontWeight: 850,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          {scene.text}
        </div>
      </div>
      <ProductImage
        src={imageUrl}
        style={{
          position: 'absolute',
          left: 44,
          top: 850,
          rotate: `${index % 2 === 0 ? '-2deg' : '2deg'}`,
          scale: interpolate(frame, [0, 36], [0.94, 1], { extrapolateRight: 'clamp' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 110,
          left: 82,
          right: 82,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <div style={{ fontSize: 28, color: colors.orange, fontWeight: 900 }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{ width: 50, height: 2, background: 'rgba(255,255,255,0.35)' }} />
        <div style={{ fontSize: 24, letterSpacing: 4, color: colors.muted, fontWeight: 700 }}>
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </div>
      </div>
    </Background>
  );
};

const ClosingScene: React.FC<{
  title: string;
  score: number;
  callToAction: string;
  imageUrl: string;
}> = ({ title, score, callToAction, imageUrl }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0.92, 1], { extrapolateRight: 'clamp' });

  return (
    <Background>
      <div style={{ position: 'absolute', top: 150, left: 82, right: 82, textAlign: 'center' }}>
        <Eyebrow>{score > 0 ? `Nota do review • ${score.toFixed(1)} / 10` : 'Conclusão editorial'}</Eyebrow>
        <div style={{ marginTop: 35, fontSize: 72, lineHeight: 1.02, fontWeight: 900, letterSpacing: -4 }}>
          {score > 0 ? 'Vale a pena para você?' : 'Faz sentido para seu uso?'}
        </div>
      </div>
      <ProductImage
        src={imageUrl}
        style={{ position: 'absolute', left: 40, top: 620, scale }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 260,
          left: 82,
          right: 82,
          textAlign: 'center',
          fontSize: 37,
          lineHeight: 1.18,
          color: colors.muted,
        }}
      >
        {callToAction}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 116,
          left: 100,
          right: 100,
          textAlign: 'center',
          padding: '26px 24px',
          background: colors.orange,
          color: colors.ink,
          borderRadius: 80,
          fontSize: 33,
          fontWeight: 900,
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
    </Background>
  );
};

const AccentLine: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 84,
      left: 82,
      width: 916,
      height: 4,
      background: 'rgba(255,255,255,0.15)',
    }}
  >
    <div style={{ width: '100%', height: '100%', background: colors.orange }} />
  </div>
);

const SubtitleOverlay: React.FC<{
  entries: EditorialSubtitle[];
  frame: number;
  fps: number;
}> = ({ entries, frame, fps }) => {
  const time = frame / fps;
  const entry = entries.find((item) => time >= item.start && time < item.end);

  if (!entry) return null;

  const progress = (time - entry.start) / Math.max(0.01, entry.end - entry.start);
  const opacity = interpolate(progress, [0, 0.08, 0.92, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        bottom: 200,
        left: 72,
        right: 72,
        opacity,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          maxWidth: '100%',
          padding: '12px 20px',
          borderRadius: 12,
          background: 'rgba(9,13,22,.86)',
          color: '#fff',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.12,
          textShadow: '0 2px 3px rgba(0,0,0,.4)',
        }}
      >
        {entry.text}
      </span>
    </div>
  );
};

export const EditorialReview: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imageUrl = props.productImages?.[0] || props.imageUrl;
  const hookFrames = (props.hookDuration ?? HookFrames) * fps;
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, props.totalDuration * fps - scenesEndFrame);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink }}>
      <Audio src={props.audioUrl} volume={0.94} />
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <OpeningScene
          title={props.title}
          category={props.category}
          hook={props.hook}
          imageUrl={imageUrl}
        />
      </Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)}
          premountFor={fps}
        >
          <FeatureScene
            scene={scene}
            index={index}
            count={props.scenes.length}
            category={props.category}
            imageUrl={imageUrl}
            brollUrl={props.brollVideos?.[index % Math.max(1, props.brollVideos.length)]}
          />
        </Sequence>
      ))}
      <Sequence from={scenesEndFrame} durationInFrames={closingDuration} premountFor={fps}>
        <ClosingScene
          title={props.title}
          score={props.score}
          callToAction={props.callToAction}
          imageUrl={imageUrl}
        />
      </Sequence>
      <SubtitleOverlay entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
