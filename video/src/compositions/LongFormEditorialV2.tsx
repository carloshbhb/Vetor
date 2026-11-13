import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import { KineticCaption } from '../components/KineticCaption';
import { resolveMediaSource } from '../utils/media-source';
import type { EditorialSubtitle } from './EditorialReview';

export type LongFormVisualType =
  | 'overview'
  | 'detail'
  | 'specification'
  | 'comparison'
  | 'tradeoff'
  | 'result';

export type LongFormEditorialScene = {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
  brollKeywords: string[];
  startFrame: number;
  endFrame: number;
  visualType: LongFormVisualType;
  imageUrl?: string;
  metric?: string;
  metricLabel?: string;
  leftTitle?: string;
  leftText?: string;
  rightTitle?: string;
  rightText?: string;
  bullets?: string[];
};

export type LongFormEditorialV2Props = {
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
  productImages?: string[];
  scenes: LongFormEditorialScene[];
  audioUrl: string;
  musicUrl?: string;
  subtitleEntries: EditorialSubtitle[];
  callToAction: string;
  totalDuration: number;
  fps: number;
  hookDuration: number;
};

const C = {
  bg: '#080C14',
  panel: '#101B2B',
  panel2: '#14243A',
  text: '#F7FAFF',
  muted: '#AEB8C8',
  blue: '#4285F4',
  deep: '#1428A0',
  cyan: '#70C4FF',
  amber: '#FFB85C',
  green: '#89E6C2',
};

const Eyebrow: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = C.cyan }) => (
  <div style={{ color: tone, fontSize: 22, fontWeight: 900, letterSpacing: 4, lineHeight: 1.15 }}>
    {children}
  </div>
);

const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: 'radial-gradient(ellipse at 74% 40%, #1B3151 0%, #101B2B 42%, #080C14 100%)', color: C.text, fontFamily: 'Inter, Arial, sans-serif' }}>
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 78% 20%, rgba(66,133,244,.18), transparent 26%)' }} />
    {children}
    <AbsoluteFill style={{ pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(4,8,16,.12),transparent 24%,transparent 78%,rgba(4,8,16,.45))' }} />
  </AbsoluteFill>
);

const ProductImage: React.FC<{
  src: string;
  style?: React.CSSProperties;
}> = ({ src, style }) => (
  <Img
    src={resolveMediaSource(src)}
    style={{
      width: 720,
      height: 600,
      objectFit: 'contain',
      filter: 'drop-shadow(0 28px 42px rgba(0,0,0,.45))',
      ...style,
    }}
  />
);

const Opening: React.FC<{
  title: string;
  category: string;
  hook: string;
  imageUrl: string;
}> = ({ title, category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110, mass: 0.85 } });
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(enter, [0, 1], [0.86, 1.02]);
  return (
    <Backdrop>
      <div style={{ position: 'absolute', top: 142, left: 130, width: 760, opacity: titleOpacity, transform: 'translateY(' + interpolate(enter, [0, 1], [34, 0]) + 'px)' }}>
        <Eyebrow>VETOR ORIGINAL  /  {category.toUpperCase()}</Eyebrow>
        <div style={{ marginTop: 26, fontSize: 70, fontWeight: 950, lineHeight: 1.02, letterSpacing: -3.2, maxWidth: 760 }}>{hook}</div>
        <div style={{ marginTop: 26, color: C.muted, fontSize: 30, fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: 42, display: 'flex', gap: 12, alignItems: 'center' }}>
          {['VISÃO GERAL', 'DETALHES', 'RESULTADO'].map((label, index) => (
            <div key={label} style={{ border: '1px solid rgba(112,196,255,.38)', background: 'rgba(16,27,43,.78)', borderRadius: 100, padding: '12px 18px', color: index === 0 ? C.cyan : C.muted, fontSize: 17, fontWeight: 850, letterSpacing: 1.2 }}>{label}</div>
          ))}
        </div>
      </div>
      <ProductImage src={imageUrl} style={{ position: 'absolute', right: 320, top: 210, width: 650, height: 590, transform: 'scale(' + imageScale + ')', opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' }) }} />
      <div style={{ position: 'absolute', left: 130, right: 320, bottom: 130, height: 4, borderRadius: 10, background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
    </Backdrop>
  );
};

const SceneImage: React.FC<{ src: string; frame: number; progress: number; crop?: boolean }> = ({ src, frame, progress, crop = false }) => {
  const zoom = interpolate(progress, [0, 1], crop ? [1.22, 1.52] : [0.96, 1.08]);
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', right: 320, top: 196, width: 650, height: 560, overflow: 'hidden', borderRadius: 30, border: '1px solid rgba(112,196,255,.24)', background: 'linear-gradient(145deg,rgba(26,48,77,.9),rgba(8,12,20,.5))', boxShadow: '0 28px 72px rgba(0,0,0,.34)', opacity }}>
      <ProductImage src={src} style={{ width: '100%', height: '100%', objectFit: crop ? 'cover' : 'contain', transform: 'scale(' + zoom + ')', filter: crop ? 'drop-shadow(0 16px 30px rgba(0,0,0,.4))' : undefined }} />
    </div>
  );
};

const MetricPanel: React.FC<{ metric: string; label: string; frame: number }> = ({ metric, label, frame }) => (
  <div style={{ position: 'absolute', left: 132, bottom: 220, minWidth: 390, padding: '24px 30px 26px', borderRadius: 22, background: 'rgba(10,18,30,.94)', border: '1px solid rgba(112,196,255,.52)', boxShadow: '0 20px 60px rgba(0,0,0,.38)', opacity: interpolate(frame, [8, 24], [0, 1], { extrapolateRight: 'clamp' }), transform: 'translateY(' + interpolate(frame, [8, 24], [24, 0], { extrapolateRight: 'clamp' }) + 'px)' }}>
    <div style={{ fontSize: 64, fontWeight: 950, lineHeight: 1, letterSpacing: -2.5 }}>{metric}</div>
    <div style={{ marginTop: 12, color: C.cyan, fontSize: 18, fontWeight: 900, letterSpacing: 2.2 }}>{label.toUpperCase()}</div>
  </div>
);

const ComparePanel: React.FC<{ scene: LongFormEditorialScene; frame: number }> = ({ scene, frame }) => {
  const cards = [
    { title: scene.leftTitle || 'PRIORIZE', body: scene.leftText || 'O que atende à necessidade principal.', accent: C.cyan },
    { title: scene.rightTitle || 'VERIFIQUE', body: scene.rightText || 'O que precisa ser conferido antes de decidir.', accent: C.amber },
  ];
  return (
    <div style={{ position: 'absolute', left: 130, right: 360, top: 350, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' }) }}>
      {cards.map((card, index) => (
        <div key={card.title} style={{ minHeight: 286, padding: '30px 34px', borderRadius: 26, border: '1px solid ' + card.accent + '80', background: 'linear-gradient(145deg,rgba(18,34,56,.96),rgba(8,14,24,.96))', transform: 'translateY(' + interpolate(frame, [0, 20], [index === 0 ? 28 : 46, 0], { extrapolateRight: 'clamp' }) + 'px)' }}>
          <Eyebrow tone={card.accent}>{String(index + 1).padStart(2, '0')} / {card.title}</Eyebrow>
          <div style={{ marginTop: 25, color: C.text, fontSize: 35, fontWeight: 850, lineHeight: 1.2 }}>{card.body}</div>
        </div>
      ))}
    </div>
  );
};

const EditorialScene: React.FC<{
  scene: LongFormEditorialScene;
  index: number;
  count: number;
  imageUrl: string;
}> = ({ scene, index, count, imageUrl }) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.max(0, Math.min(1, frame / duration));
  const lift = interpolate(frame, [0, 20], [32, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const isTradeoff = scene.visualType === 'tradeoff';
  const headline = scene.visualCue.toUpperCase();
  const bullets = scene.bullets?.slice(0, 3) || [];
  const image = scene.imageUrl || imageUrl;

  return (
    <Backdrop>
      <div style={{ position: 'absolute', left: 132, top: 132, width: 790, opacity, transform: 'translateY(' + lift + 'px)' }}>
        <Eyebrow tone={isTradeoff ? C.amber : C.cyan}>CAPÍTULO {String(index + 1).padStart(2, '0')}  /  {scene.visualType.toUpperCase()}</Eyebrow>
        <div style={{ marginTop: 24, fontSize: 58, fontWeight: 950, letterSpacing: -2.5, lineHeight: 1.04 }}>{headline}</div>
        <div style={{ marginTop: 24, maxWidth: 760, color: C.muted, fontSize: 30, fontWeight: 650, lineHeight: 1.28 }}>{scene.text}</div>
      </div>

      {scene.visualType === 'comparison' ? (
        <ComparePanel scene={scene} frame={frame} />
      ) : (
        <SceneImage src={image} frame={frame} progress={progress} crop={scene.visualType === 'detail'} />
      )}

      {scene.visualType === 'specification' && scene.metric ? (
        <MetricPanel metric={scene.metric} label={scene.metricLabel || 'DADO CONFIRMADO'} frame={frame} />
      ) : null}

      {scene.visualType === 'tradeoff' ? (
        <div style={{ position: 'absolute', left: 132, bottom: 210, width: 690, padding: '22px 28px', borderRadius: 20, borderLeft: '7px solid ' + C.amber, background: 'rgba(34,25,15,.88)', opacity: interpolate(frame, [8, 22], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <Eyebrow tone={C.amber}>PONTO DE ATENÇÃO</Eyebrow>
          {bullets.map((bullet, bulletIndex) => <div key={bullet} style={{ marginTop: 12, color: C.text, fontSize: 25, fontWeight: 750 }}>• {bullet}</div>)}
        </div>
      ) : null}

      {scene.visualType === 'result' ? (
        <div style={{ position: 'absolute', left: 132, bottom: 195, display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 780 }}>
          {bullets.map((bullet) => <div key={bullet} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(18,48,49,.9)', border: '1px solid rgba(137,230,194,.42)', color: C.green, fontSize: 21, fontWeight: 850 }}>{bullet}</div>)}
          <div style={{ width: '100%', marginTop: 6, color: C.text, fontSize: 22, fontWeight: 800 }}>{scene.text}</div>
        </div>
      ) : null}

      {scene.visualType === 'overview' ? (
        <div style={{ position: 'absolute', left: 132, bottom: 210, display: 'flex', gap: 12 }}>
          {['ENTENDER', 'MONTAR', 'CONFERIR'].map((item, itemIndex) => <div key={item} style={{ padding: '13px 17px', borderRadius: 100, background: 'rgba(16,27,43,.9)', border: '1px solid rgba(112,196,255,.34)', color: itemIndex === 0 ? C.cyan : C.muted, fontSize: 17, fontWeight: 900, letterSpacing: 1.2 }}>{item}</div>)}
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: 132, right: 320, bottom: 92, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ color: C.cyan, fontSize: 20, fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</div>
        <div style={{ flex: 1, height: 4, overflow: 'hidden', borderRadius: 12, background: 'rgba(255,255,255,.16)' }}>
          <div style={{ width: (progress * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)' }} />
        </div>
        <div style={{ color: C.muted, fontSize: 18, fontWeight: 850, letterSpacing: 2 }}>{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</div>
      </div>
    </Backdrop>
  );
};

const Captions: React.FC<{
  entries: EditorialSubtitle[];
  frame: number;
  fps: number;
}> = ({ entries, frame, fps }) => {
  const time = frame / fps;
  const entry = entries.find((item) => time >= item.start && time < item.end);
  if (!entry) return null;
  const progress = Math.max(0, Math.min(1, (time - entry.start) / Math.max(.01, entry.end - entry.start)));
  const opacity = interpolate(progress, [0, .05, .94, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <KineticCaption variant="landscape" text={entry.text} progress={progress} opacity={opacity} words={entry.words} time={time} fps={fps} maxVisibleWords={6} />;
};

export const calculateLongFormEditorialV2Metadata: CalculateMetadataFunction<LongFormEditorialV2Props> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.totalDuration * props.fps)),
});

export const LongFormEditorialV2: React.FC<LongFormEditorialV2Props> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = Math.max(1, Math.round(props.hookDuration * fps));
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={0.96} />
      {props.musicUrl ? <Audio src={resolveMediaSource(props.musicUrl)} volume={0.045} loop /> : null}
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <Opening title={props.title} category={props.category} hook={props.hook} imageUrl={image} />
      </Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)} premountFor={fps}>
          <EditorialScene scene={scene} index={index} count={props.scenes.length} imageUrl={props.productImages?.[index % Math.max(1, props.productImages.length)] || image} />
        </Sequence>
      ))}
      <Captions entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
