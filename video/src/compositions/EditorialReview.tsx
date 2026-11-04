import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { KineticCaption, type CaptionWord } from '../components/KineticCaption';
import { BeatStage, BeatWipe, STAGE } from '../components/BeatStage';
import {
  createSceneVisualPlan,
  extractPrimaryMetric,
  planSceneBeats,
  type SceneVisualPlan,
} from '../utils/visual-storyboard';
import { fonts } from '../styles/fonts';
import { resolveMediaSource } from '../utils/media-source';
import { fitHeadlineSize, headlineFromText, toHeadline, truncateHeadline } from '../utils/scene-headline';

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
  /** Real per-word timings from the TTS; drives the active-word highlight. */
  words?: CaptionWord[];
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
  /** Optional background music (low volume under the narration). */
  musicUrl?: string;
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

const HookFrames = 3;
/** Shorts text column: 70px left, 170px right keeps clear of the YouTube Shorts button column. */
const TEXT = { left: 70, right: 170 } as const;

export const calculateEditorialMetadata: CalculateMetadataFunction<EditorialReviewProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.totalDuration * props.fps)),
});

const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 52% 43%, #1B2D4C 0%, #0F1623 48%, #080C14 100%)',
      color: colors.paper,
      fontFamily: fonts.body,
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
      fontSize: 30,
      fontWeight: 850,
      letterSpacing: 5,
      lineHeight: 1.15,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const AccentLine: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 405,
      left: TEXT.left,
      right: TEXT.right,
      height: 4,
      borderRadius: 10,
      background: 'rgba(255,255,255,.12)',
      overflow: 'hidden',
    }}
  >
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
  </div>
);

/** Headline size that fits the fixed 220..480 header band without touching the media stage. */
const HEADER_TEXT_WIDTH = 740;
const HEADER_TEXT_HEIGHT = 200;

const StageImage: React.FC<{ src: string; scale?: number; y?: number }> = ({ src, scale = 1, y = 0 }) => (
  <Img
    src={resolveMediaSource(src)}
    style={{
      position: 'absolute',
      left: STAGE.left,
      top: STAGE.top,
      width: STAGE.width,
      height: STAGE.height,
      objectFit: 'contain',
      transform: `translateY(${y}px) scale(${scale})`,
      filter: 'drop-shadow(0 38px 52px rgba(0,0,0,.55))',
    }}
  />
);

/**
 * The hook is on screen, fully visible, from frame 0: Shorts viewers decide in the first
 * second, so there is no fade-in from nothing. The headline lands with a spring punch.
 */
const OpeningScene: React.FC<{
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
}> = ({ category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = spring({ frame, fps, durationInFrames: 18, config: { damping: 12, stiffness: 180, mass: 0.7 } });
  const scale = interpolate(punch, [0, 1], [1.14, 1]);
  const rise = interpolate(punch, [0, 1], [30, 0]);
  const productScale = interpolate(frame, [0, 3 * fps], [0.94, 1.0], { extrapolateRight: 'clamp' });
  const hookSize = fitHeadlineSize(hook, {
    width: HEADER_TEXT_WIDTH,
    maxHeight: HEADER_TEXT_HEIGHT,
    maxSize: 96,
    minSize: 42,
  });

  return (
    <Background>
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: TEXT.left,
          right: TEXT.right,
          transformOrigin: 'left top',
          transform: `translateY(${rise}px) scale(${scale})`,
        }}
      >
        <Eyebrow>Vetor • {category}</Eyebrow>
        <div
          style={{
            marginTop: 18,
            fontFamily: fonts.heading,
            fontSize: hookSize,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: hookSize < 60 ? -2 : -4,
            overflowWrap: 'anywhere',
            textShadow: '0 10px 34px rgba(0,0,0,.45)',
          }}
        >
          {hook}
        </div>
      </div>
      <StageImage src={imageUrl} scale={productScale} y={10} />
      <AccentLine />
    </Background>
  );
};

const FeatureScene: React.FC<{
  scene: EditorialScene;
  index: number;
  count: number;
  category: string;
  images: string[];
  brollUrl?: string;
  visual: SceneVisualPlan;
  seed: string;
}> = ({ scene, index, count, category, images, brollUrl, visual, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.max(0, Math.min(1, frame / durationFrames));
  const label = toHeadline(scene.visualCue, headlineFromText(scene.text, category));
  const labelSize = fitHeadlineSize(label, {
    width: HEADER_TEXT_WIDTH,
    maxHeight: HEADER_TEXT_HEIGHT,
    maxSize: 96,
    minSize: 44,
  });
  const metric = visual.mode === 'price-check' || visual.mode === 'tradeoff' ? null : extractPrimaryMetric(scene.text);
  const warning = visual.mode === 'tradeoff';
  const eyebrow = visual.mode === 'price-check'
    ? 'CONFIRA O PREÇO ATUAL'
    : warning
      ? 'PONTO DE ATENÇÃO'
      : visual.label;
  const accent = warning ? colors.amber : colors.cyan;

  const beats = React.useMemo(
    () =>
      planSceneBeats(durationFrames, {
        fps,
        hasBroll: Boolean(brollUrl),
        hasMetric: Boolean(metric),
        imageCount: images.length,
        seed: seed + ':' + scene.id,
      }),
    [durationFrames, fps, brollUrl, metric, images.length, seed, scene.id],
  );

  const enter = spring({ frame, fps, durationInFrames: 18, config: { damping: 14, stiffness: 160, mass: 0.7 } });
  const lift = interpolate(enter, [0, 1], [46, 0]);

  return (
    <Background>
      {beats.map((beat, beatIndex) => (
        <Sequence
          key={beatIndex}
          from={beat.startFrame}
          durationInFrames={Math.max(1, beat.endFrame - beat.startFrame)}
          premountFor={beat.kind === 'broll' ? fps : 0}
        >
          <BeatStage
            beat={beat}
            images={images}
            brollUrl={brollUrl}
            metric={metric}
            metricLabel="ESPECIFICAÇÃO CITADA"
            accent={accent}
          />
          <BeatWipe strength={beatIndex === 0 ? 0.8 : 0.4} />
          {beat.kind === 'callout' ? <Audio src={staticFile('sfx/pop.mp3')} volume={0.5} /> : null}
        </Sequence>
      ))}

      <div
        style={{
          position: 'absolute',
          top: 220,
          left: TEXT.left,
          right: TEXT.right,
          transform: `translateY(${lift}px)`,
          opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <Eyebrow color={accent}>{eyebrow || category}</Eyebrow>
        <div
          style={{
            marginTop: 18,
            fontFamily: fonts.heading,
            fontSize: labelSize,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: labelSize < 60 ? -2 : -3.4,
            overflowWrap: 'anywhere',
            textShadow: '0 8px 28px rgba(0,0,0,.6)',
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 360,
          left: TEXT.left,
          right: TEXT.right,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          color: colors.muted,
          opacity: interpolate(frame, [8, 20], [0, 0.95], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, color: colors.blue }}>{String(index + 1).padStart(2, '0')}</div>
        <div style={{ flex: 1, height: 5, borderRadius: 8, background: 'rgba(255,255,255,.16)', overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </div>
      </div>
      <AccentLine />
      {/* Scene-change sound: starts with the scene, sits well below the narration. */}
      <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.32} />
    </Background>
  );
};

const ClosingScene: React.FC<{
  title: string;
  score: number;
  callToAction: string;
  imageUrl: string;
}> = ({ title, score, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, durationInFrames: 20, config: { damping: 13, stiffness: 150, mass: 0.8 } });
  const scale = interpolate(frame, [0, 60], [0.94, 1.0], { extrapolateRight: 'clamp' });
  const question = 'Vale a pena para o seu uso?';
  const questionSize = fitHeadlineSize(question, {
    width: HEADER_TEXT_WIDTH,
    maxHeight: 160,
    maxSize: 96,
    minSize: 48,
  });
  const shortTitle = truncateHeadline(title, 52);

  return (
    <Background>
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: TEXT.left,
          right: TEXT.right,
          opacity: interpolate(enter, [0, 1], [0.15, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px)`,
        }}
      >
        <Eyebrow>{score > 0 ? `NOTA EDITORIAL • ${score.toFixed(1)} / 10` : 'VEREDITO EDITORIAL'}</Eyebrow>
        <div
          style={{
            marginTop: 12,
            color: colors.muted,
            fontSize: 24,
            fontWeight: 750,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {shortTitle}
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: fonts.heading,
            fontSize: questionSize,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -3.2,
          }}
        >
          {question}
        </div>
      </div>
      <StageImage src={imageUrl} scale={scale} />
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
  const opacity = interpolate(progress, [0, 0.04, 0.94, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <KineticCaption
      text={entry.text}
      progress={progress}
      opacity={opacity}
      words={entry.words}
      time={time}
      fps={fps}
      maxVisibleWords={6}
    />
  );
};

export const EditorialReview: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gallery = props.productImages && props.productImages.length ? props.productImages : [props.imageUrl];
  const image = gallery[0] || props.imageUrl;
  const hookFrames = Math.round((props.hookDuration ?? HookFrames) * fps);
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, Math.round(props.totalDuration * fps) - scenesEndFrame);
  const visualPlan = createSceneVisualPlan(props.scenes, props.title + '|' + props.category);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink }}>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={0.96} />
      {props.musicUrl ? <Audio src={resolveMediaSource(props.musicUrl)} volume={0.07} loop /> : null}
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <OpeningScene title={props.title} category={props.category} hook={props.hook} imageUrl={image} />
      </Sequence>
      {props.scenes.map((scene, index) => {
        // Each scene leads with a different photo so consecutive scenes do not look alike.
        const offset = index % gallery.length;
        const images = [...gallery.slice(offset), ...gallery.slice(0, offset)];
        return (
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
              images={images}
              brollUrl={props.brollVideos?.[index] || undefined}
              visual={visualPlan[index]}
              seed={props.title}
            />
          </Sequence>
        );
      })}
      <Sequence from={scenesEndFrame} durationInFrames={closingDuration} premountFor={fps}>
        <ClosingScene title={props.title} score={props.score} callToAction={props.callToAction} imageUrl={image} />
      </Sequence>
      <SubtitleOverlay entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
