import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Loop,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { EditorialReviewProps, EditorialScene } from './EditorialReview';
import { KineticCaption } from '../components/KineticCaption';
import { resolveMediaSource } from '../utils/media-source';
import { createSceneVisualPlan, extractPrimaryMetric, type SceneVisualPlan } from '../utils/visual-storyboard';

const palette = {
  background: '#080C14',
  surface: '#0F1623',
  text: '#F7FAFF',
  muted: '#AEB8C8',
  blue: '#4285F4',
  deepBlue: '#1428A0',
  cyan: '#70C4FF',
  amber: '#FFB85C',
};

const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 65% 48%, #1B2D4C 0%, #0F1623 50%, #080C14 100%)',
      color: palette.text,
      fontFamily: 'Inter, DM Sans, Arial, sans-serif',
    }}
  >
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 76% 14%, rgba(66,133,244,.20), transparent 29%), radial-gradient(circle at 8% 90%, rgba(20,40,160,.18), transparent 35%)',
      }}
    />
    {children}
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: 'linear-gradient(180deg,rgba(4,8,16,.14),transparent 28%,transparent 72%,rgba(4,8,16,.48))',
      }}
    />
  </AbsoluteFill>
);

const Product: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img
    src={resolveMediaSource(src)}
    style={{
      width: 660,
      height: 560,
      objectFit: 'contain',
      filter: 'drop-shadow(0 28px 42px rgba(0,0,0,.48))',
      ...style,
    }}
  />
);

const Eyebrow: React.FC<{ children: React.ReactNode; warning?: boolean }> = ({ children, warning }) => (
  <div
    style={{
      color: warning ? palette.amber : palette.cyan,
      fontSize: 23,
      fontWeight: 850,
      letterSpacing: 4,
      lineHeight: 1.15,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const Opening: React.FC<{
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
}> = ({ title, category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 100], [0.94, 1.08], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const rise = interpolate(frame, [0, 24], [38, 0], { extrapolateRight: 'clamp' });

  return (
    <Background>
      <div style={{ position: 'absolute', top: 138, left: 130, width: 830, opacity, transform: 'translateY(' + rise + 'px)' }}>
        <Eyebrow>Vetor • {category} • Análise completa</Eyebrow>
        <div
          style={{
            marginTop: 28,
            maxWidth: 850,
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 900,
            letterSpacing: -3.2,
            overflowWrap: 'anywhere',
            textShadow: '0 10px 34px rgba(0,0,0,.42)',
          }}
        >
          {hook}
        </div>
        <div style={{ marginTop: 28, color: palette.muted, fontSize: 29, fontWeight: 750, letterSpacing: 1.2 }}>
          {title}
        </div>
      </div>
      <Product
        src={imageUrl}
        style={{
          position: 'absolute',
          right: 350,
          top: 190,
          width: 610,
          height: 560,
          transform: 'scale(' + scale + ')',
        }}
      />
      <div style={{ position: 'absolute', left: 130, bottom: 260, color: palette.muted, fontSize: 20, letterSpacing: 3 }}>
        ANÁLISE EDITORIAL • RECURSOS • LIMITAÇÕES • VEREDITO
      </div>
      <div style={{ position: 'absolute', left: 130, right: 390, bottom: 225, height: 3, borderRadius: 4, background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
    </Background>
  );
};

const LongFeature: React.FC<{
  scene: EditorialScene;
  index: number;
  count: number;
  category: string;
  imageUrl: string;
  brollUrl?: string;
  visual: SceneVisualPlan;
}> = ({ scene, index, count, category, imageUrl, brollUrl, visual }) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.max(0, Math.min(1, frame / duration));
  const phaseFrames = Math.max(1, duration / 3);
  const phase = Math.min(2, Math.floor(frame / phaseFrames));
  const phaseProgress = Math.max(0, Math.min(1, (frame - phase * phaseFrames) / phaseFrames));
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const lift = interpolate(frame, [0, 22], [28, 0], { extrapolateRight: 'clamp' });
  const isLeft = visual.motion === 'pan-left' || visual.motion === 'tilt-left';
  const isRight = visual.motion === 'pan-right' || visual.motion === 'tilt-right';
  const drift = isLeft
    ? interpolate(progress, [0, 1], [40, -40])
    : isRight
      ? interpolate(progress, [0, 1], [-40, 40])
      : visual.motion === 'float' ? Math.sin(progress * Math.PI * 2) * 12 : 0;
  const scale = visual.motion === 'push-in'
    ? interpolate(progress, [0, 1], [1.01, 1.14])
    : interpolate(progress, [0, 1], [1.08, 1.02]);
  const rotate = visual.motion === 'tilt-left' ? -1.5 : visual.motion === 'tilt-right' ? 1.5 : 0;
  const metric = visual.mode === 'specification' ? extractPrimaryMetric(scene.text) : null;
  const warning = visual.mode === 'tradeoff';
  const label = visual.mode === 'price-check'
    ? 'DECISÃO DE COMPRA'
    : warning ? 'PONTO DE ATENÇÃO' : visual.label;
  const title = String(scene.visualCue || category).replace(/[.!?]+$/, '');
  const showBroll = Boolean(brollUrl) && (phase === 1 || (visual.mode === 'lifestyle' && phase === 2));

  return (
    <Background>
      {showBroll && brollUrl ? (
        <AbsoluteFill
          style={{
            left: 1010,
            right: 360,
            top: 205,
            bottom: 250,
            overflow: 'hidden',
            border: '1px solid rgba(112,196,255,.34)',
            borderRadius: 28,
            boxShadow: '0 24px 70px rgba(0,0,0,.36)',
            opacity: interpolate(phaseProgress, [0, .16, .9, 1], [0, 1, 1, 0], { extrapolateRight: 'clamp' }),
          }}
        >
          <Loop durationInFrames={duration}>
            <OffthreadVideo src={resolveMediaSource(brollUrl)} muted delayRenderTimeoutInMilliseconds={90000} delayRenderRetries={1} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.88) brightness(.78)' }} />
          </Loop>
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 130,
          width: 790,
          opacity: fade,
          transform: 'translateY(' + lift + 'px)',
        }}
      >
        <Eyebrow warning={warning}>{label}</Eyebrow>
        <div style={{ marginTop: 26, maxWidth: 790, fontSize: 56, lineHeight: 1.06, fontWeight: 900, letterSpacing: -2.2 }}>
          {title}
        </div>
        <div style={{ marginTop: 23, maxWidth: 780, color: palette.muted, fontSize: 32, lineHeight: 1.26, fontWeight: 650 }}>
          {visual.mode === 'price-check'
            ? 'Confira o preço atual, o frete e as condições do anúncio antes de decidir.'
            : visual.mode === 'tradeoff'
              ? 'Uma limitação que vale considerar antes da compra.'
              : visual.mode === 'comparison'
                ? 'Compare este critério com as alternativas que fazem sentido para seu uso.'
                : 'Veja como este recurso influencia a experiência no uso cotidiano.'}
        </div>
      </div>

      {metric ? (
        <div
          style={{
            position: 'absolute',
            left: 130,
            top: 610,
            minWidth: 310,
            padding: '20px 26px',
            borderRadius: 20,
            background: 'rgba(15,22,35,.94)',
            border: '1px solid rgba(112,196,255,.45)',
            boxShadow: '0 18px 45px rgba(0,0,0,.3)',
            opacity: interpolate(frame, [phaseFrames * .2, phaseFrames * .55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{metric}</div>
          <div style={{ marginTop: 10, color: palette.cyan, fontSize: 18, fontWeight: 850, letterSpacing: 2 }}>ESPECIFICAÇÃO CITADA</div>
        </div>
      ) : null}

      <Product
        src={imageUrl}
        style={{
          position: 'absolute',
          right: 340,
          top: 245,
          width: 620,
          height: 520,
          transform: 'translateX(' + drift + 'px) scale(' + scale + ') rotate(' + rotate + 'deg)',
          filter: showBroll ? 'drop-shadow(0 14px 28px rgba(0,0,0,.65))' : undefined,
        }}
      />

      <div style={{ position: 'absolute', left: 130, right: 390, bottom: 260, display: 'flex', alignItems: 'center', gap: 18, color: palette.muted }}>
        <div style={{ color: palette.blue, fontSize: 20, fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</div>
        <div style={{ flex: 1, height: 3, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,.16)' }}>
          <div style={{ width: (progress * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: 2 }}>{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</div>
      </div>
      <div style={{ position: 'absolute', left: 130, right: 390, bottom: 225, height: 3, borderRadius: 4, background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
    </Background>
  );
};

const LongEnd: React.FC<{
  title: string;
  score: number;
  callToAction: string;
  imageUrl: string;
}> = ({ title, score, callToAction, imageUrl }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 60], [0.94, 1.06], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <Background>
      <div style={{ position: 'absolute', left: 130, top: 170, width: 820, opacity }}>
        <Eyebrow>{score > 0 ? 'NOTA EDITORIAL • ' + score.toFixed(1) + ' / 10' : 'VEREDITO EDITORIAL'}</Eyebrow>
        <div style={{ marginTop: 30, fontSize: 72, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3 }}>
          Vale a pena para o seu uso?
        </div>
        <div style={{ marginTop: 35, maxWidth: 780, color: palette.muted, fontSize: 31, lineHeight: 1.25 }}>
          {callToAction}
        </div>
        <div style={{ marginTop: 32, display: 'inline-block', background: palette.blue, color: '#fff', padding: '18px 28px', borderRadius: 18, fontSize: 25, fontWeight: 900 }}>
          CONSULTE O REVIEW COMPLETO
        </div>
      </div>
      <Product src={imageUrl} style={{ position: 'absolute', right: 340, top: 210, width: 620, height: 550, transform: 'scale(' + scale + ')' }} />
      <div style={{ position: 'absolute', left: 130, right: 390, bottom: 225, height: 3, background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
      <div style={{ position: 'absolute', left: 130, bottom: 250, color: palette.muted, fontSize: 19, letterSpacing: 2 }}>{title}</div>
    </Background>
  );
};

const LongCaptions: React.FC<{
  entries: EditorialReviewProps['subtitleEntries'];
  frame: number;
  fps: number;
}> = ({ entries, frame, fps }) => {
  const time = frame / fps;
  const entry = entries.find((item) => time >= item.start && time < item.end);
  if (!entry) return null;
  const progress = Math.max(0, Math.min(1, (time - entry.start) / Math.max(.01, entry.end - entry.start)));
  const opacity = interpolate(progress, [0, .06, .92, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <KineticCaption variant="landscape" text={entry.text} progress={progress} opacity={opacity} words={entry.words} time={time} fps={fps} />;
};

export const EditorialReviewLandscape: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = (props.hookDuration ?? 3) * fps;
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, props.totalDuration * fps - scenesEndFrame);
  const visualPlan = createSceneVisualPlan(props.scenes, props.title + '|' + props.category + '|long');
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={0.96} />
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <Opening title={props.title} category={props.category} hook={props.hook} imageUrl={image} />
      </Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)} premountFor={fps}>
          <LongFeature
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
        <LongEnd title={props.title} score={props.score} callToAction={props.callToAction} imageUrl={image} />
      </Sequence>
      <LongCaptions entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
