import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { KineticCaption } from '../components/KineticCaption';
import { createSceneVisualPlan, extractPrimaryMetric, type SceneVisualPlan } from '../utils/visual-storyboard';

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
  ink: '#080C14',
  surface: '#0F1623',
  paper: '#F7FAFF',
  muted: '#AEB8C8',
  blue: '#4285F4',
  blueDark: '#1428A0',
  cyan: '#70C4FF',
  amber: '#FFB85C',
};

const font = 'Inter, DM Sans, Arial, sans-serif';
const HookFrames = 3;

export const calculateEditorialMetadata: CalculateMetadataFunction<EditorialReviewProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.totalDuration * props.fps)),
});

const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 52% 43%, #1B2D4C 0%, #0F1623 48%, #080C14 100%)',
      color: colors.paper,
      fontFamily: font,
    }}
  >
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 82% 16%, rgba(66,133,244,0.22), transparent 27%), radial-gradient(circle at 14% 76%, rgba(20,40,160,0.23), transparent 32%)',
      }}
    />
    {children}
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(4,8,16,.12) 0%, transparent 26%, transparent 72%, rgba(4,8,16,.48) 100%)',
      }}
    />
  </AbsoluteFill>
);

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = colors.cyan }) => (
  <div
    style={{
      color,
      fontSize: 25,
      fontWeight: 850,
      letterSpacing: 4.5,
      lineHeight: 1.15,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const ProductImage: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img
    src={src}
    style={{
      width: 820,
      height: 660,
      objectFit: 'contain',
      filter: 'drop-shadow(0 34px 48px rgba(0,0,0,.52))',
      ...style,
    }}
  />
);

const AccentLine: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 405,
      left: 190,
      right: 190,
      height: 3,
      borderRadius: 10,
      background: 'rgba(255,255,255,.12)',
      overflow: 'hidden',
    }}
  >
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
  </div>
);

const OpeningScene: React.FC<{
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
}> = ({ title, category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const rise = interpolate(frame, [0, 22], [54, 0], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 3 * fps], [0.96, 1.06], { extrapolateRight: 'clamp' });

  return (
    <Background>
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 190,
          right: 190,
          opacity,
          transform: `translateY(${rise}px)`,
        }}
      >
        <Eyebrow>Vetor • {category}</Eyebrow>
        <div
          style={{
            marginTop: 30,
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 900,
            letterSpacing: -3.5,
            maxWidth: 700,
            overflowWrap: 'anywhere',
            textShadow: '0 10px 34px rgba(0,0,0,.38)',
          }}
        >
          {hook}
        </div>
      </div>
      <ProductImage
        src={imageUrl}
        style={{
          position: 'absolute',
          left: 210,
          top: 720,
          width: 660,
          height: 560,
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 430,
          left: 190,
          right: 190,
          color: colors.muted,
          fontSize: 28,
          fontWeight: 750,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          opacity: interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
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
  visual: SceneVisualPlan;
}> = ({ scene, index, count, category, imageUrl, brollUrl, visual }) => {
  const frame = useCurrentFrame();
  const durationFrames = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.max(0, Math.min(1, frame / durationFrames));
  const phaseFrames = Math.max(1, durationFrames / 3);
  const phase = Math.min(2, Math.floor(frame / phaseFrames));
  const phaseProgress = Math.max(0, Math.min(1, (frame - phase * phaseFrames) / phaseFrames));
  const enter = interpolate(frame, [0, 20], [48, 0], { extrapolateRight: 'clamp' });
  const label = (scene.visualCue || category).replace(/[.!?]+$/, '');
  const metric = visual.mode === 'specification' ? extractPrimaryMetric(scene.text) : null;
  const showBroll = Boolean(brollUrl) && (phase === 1 || (visual.mode === 'lifestyle' && phase === 2));
  const isLeftMove = visual.motion === 'pan-left' || visual.motion === 'tilt-left';
  const isRightMove = visual.motion === 'pan-right' || visual.motion === 'tilt-right';
  const drift = isLeftMove
    ? interpolate(progress, [0, 1], [24, -24])
    : isRightMove
      ? interpolate(progress, [0, 1], [-24, 24])
      : visual.motion === 'float'
        ? Math.sin(progress * Math.PI * 2) * 18
        : 0;
  const zoom = visual.motion === 'push-in'
    ? interpolate(progress, [0, 1], [1.01, 1.08])
    : visual.motion === 'float'
      ? interpolate(progress, [0, 1], [1.03, 1.06])
      : interpolate(progress, [0, 1], [1.06, 1.02]);
  const tilt = visual.motion === 'tilt-left' ? -2.2 : visual.motion === 'tilt-right' ? 2.2 : 0;
  const imageLayout = phase === 0
    ? { left: 210, top: 720, width: 660, height: 560 }
    : phase === 1
      ? { left: showBroll ? 410 : 230, top: 700, width: showBroll ? 500 : 620, height: 610 }
      : { left: 220, top: 720, width: 640, height: 570 };
  const visualLabel = visual.mode === 'price-check'
    ? 'CONFIRA O PREÇO ATUAL'
    : visual.mode === 'tradeoff'
      ? 'PONTO DE ATENÇÃO'
      : visual.label;

  return (
    <Background>
      <AbsoluteFill style={{ opacity: showBroll ? (visual.mode === 'lifestyle' ? 0.82 : 0.56) : 0 }}>
        {brollUrl ? (
          <OffthreadVideo
            src={brollUrl}
            muted
            loop
            delayRenderTimeoutInMilliseconds={90000}
            delayRenderRetries={1}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(.82) brightness(.76)',
            }}
          />
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: showBroll
            ? 'linear-gradient(180deg,rgba(8,12,20,.72) 0%,rgba(8,12,20,.18) 44%,rgba(8,12,20,.74) 100%)'
            : 'radial-gradient(ellipse at 50% 55%,rgba(66,133,244,.10),transparent 46%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 190,
          right: 190,
          transform: `translateY(${enter}px)`,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <Eyebrow color={visual.mode === 'tradeoff' ? colors.amber : colors.cyan}>
          {visualLabel || category}
        </Eyebrow>
        <div
          style={{
            marginTop: 24,
            fontSize: 60,
            lineHeight: 1.04,
            fontWeight: 900,
            letterSpacing: -2.6,
            maxWidth: 700,
            overflowWrap: 'anywhere',
            textShadow: '0 8px 28px rgba(0,0,0,.5)',
          }}
        >
          {label}
        </div>
      </div>

      {visual.mode === 'specification' && metric ? (
        <div
          style={{
            position: 'absolute',
            top: 590,
            left: 190,
            minWidth: 300,
            padding: '22px 28px',
            borderRadius: 22,
            background: 'rgba(15,22,35,.94)',
            border: '1px solid rgba(112,196,255,.44)',
            boxShadow: '0 18px 44px rgba(0,0,0,.28)',
            opacity: interpolate(frame, [phaseFrames * .2, phaseFrames * .55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [phaseFrames * .2, phaseFrames * .55], [22, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}
        >
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{metric}</div>
          <div style={{ marginTop: 12, color: colors.cyan, fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
            ESPECIFICAÇÃO CITADA
          </div>
        </div>
      ) : null}

      {visual.mode === 'price-check' ? (
        <div
          style={{
            position: 'absolute',
            top: 610,
            left: 190,
            padding: '22px 28px',
            borderRadius: 22,
            background: 'rgba(15,22,35,.94)',
            border: '1px solid rgba(66,133,244,.5)',
            boxShadow: '0 18px 44px rgba(0,0,0,.28)',
            opacity: interpolate(frame, [phaseFrames * .16, phaseFrames * .48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: 2, color: colors.cyan }}>VALOR E CONDIÇÕES</div>
          <div style={{ marginTop: 8, fontSize: 38, fontWeight: 900 }}>Confira o anúncio atualizado</div>
        </div>
      ) : null}

      {showBroll && brollUrl ? (
        <div
          style={{
            position: 'absolute',
            top: 680,
            left: 160,
            right: 160,
            bottom: 540,
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 28,
            background: 'linear-gradient(135deg,rgba(20,40,160,.20),rgba(8,12,20,.10))',
            opacity: interpolate(phaseProgress, [0, .16, .85, 1], [0, 1, 1, 0], { extrapolateRight: 'clamp' }),
          }}
        />
      ) : null}

      <ProductImage
        src={imageUrl}
        style={{
          position: 'absolute',
          ...imageLayout,
          transform: `translateX(${drift}px) scale(${zoom}) rotate(${tilt}deg)`,
          opacity: showBroll && visual.mode === 'lifestyle' ? 1 : 0.98,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 365,
          left: 190,
          right: 190,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          color: colors.muted,
          opacity: interpolate(frame, [10, 22], [0, .92], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: colors.blue }}>{String(index + 1).padStart(2, '0')}</div>
        <div style={{ flex: 1, height: 3, borderRadius: 8, background: 'rgba(255,255,255,.16)', overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </div>
      </div>
      <AccentLine />
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
  const scale = interpolate(frame, [0, 48], [0.94, 1.08], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Background>
      <div style={{ position: 'absolute', top: 260, left: 190, right: 190, opacity }}>
        <Eyebrow>{score > 0 ? `NOTA EDITORIAL • ${score.toFixed(1)} / 10` : 'VEREDITO EDITORIAL'}</Eyebrow>
        <div style={{ marginTop: 28, fontSize: 70, lineHeight: 1.02, fontWeight: 900, letterSpacing: -3, maxWidth: 700 }}>
          Vale a pena para o seu uso?
        </div>
      </div>
      <ProductImage
        src={imageUrl}
        style={{ position: 'absolute', left: 210, top: 720, width: 660, height: 560, transform: `scale(${scale})` }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 430,
          left: 190,
          right: 190,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 750,
          lineHeight: 1.18,
          color: colors.muted,
        }}
      >
        {callToAction}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 365,
          left: 190,
          right: 190,
          textAlign: 'center',
          color: colors.cyan,
          fontSize: 22,
          fontWeight: 850,
          letterSpacing: 3,
        }}
      >
        {title}
      </div>
      <AccentLine />
    </Background>
  );
};

const SubtitleOverlay: React.FC<{
  entries: EditorialSubtitle[];
  frame: number;
  fps: number;
}> = ({ entries, frame, fps }) => {
  const time = frame / fps;
  const entry = entries.find((item) => time >= item.start && time < item.end);
  if (!entry) return null;

  const progress = Math.max(0, Math.min(1, (time - entry.start) / Math.max(0.01, entry.end - entry.start)));
  const opacity = interpolate(progress, [0, .06, .92, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <KineticCaption text={entry.text} progress={progress} opacity={opacity} />;
};

export const EditorialReview: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = (props.hookDuration ?? HookFrames) * fps;
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, props.totalDuration * fps - scenesEndFrame);
  const visualPlan = createSceneVisualPlan(props.scenes, props.title + '|' + props.category);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink }}>
      <Audio src={props.audioUrl} volume={0.96} />
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <OpeningScene title={props.title} category={props.category} hook={props.hook} imageUrl={image} />
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
            imageUrl={props.productImages?.[index % Math.max(1, props.productImages.length)] || image}
            brollUrl={props.brollVideos?.[index]}
            visual={visualPlan[index]}
          />
        </Sequence>
      ))}
      <Sequence from={scenesEndFrame} durationInFrames={closingDuration} premountFor={fps}>
        <ClosingScene title={props.title} score={props.score} callToAction={props.callToAction} imageUrl={image} />
      </Sequence>
      <SubtitleOverlay entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
