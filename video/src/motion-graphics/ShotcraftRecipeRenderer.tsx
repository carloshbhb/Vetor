import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type Props = {
  recipeId: string;
  accent: string;
  label: string;
  sceneText: string;
  metric: string | null;
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const SpotlightHero: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const x = interpolate(frame, [0, 42], [-width * 0.3, width * 1.1], clamp);
  const opacity = interpolate(frame, [0, 8, 42], [0, 0.8, 0.24], clamp);
  const size = Math.min(width * 0.9, height * 0.48);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: x - size / 2, top: height * 0.22, width: size, height: size,
        borderRadius: '50%', opacity,
        background: 'radial-gradient(circle, ' + accent + '30 0%, ' + accent + '12 38%, transparent 72%)',
        filter: 'blur(8px)',
      }} />
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: height * 0.2, height: height * 0.52,
        borderTop: '1px solid ' + accent + '55', borderBottom: '1px solid ' + accent + '55',
        opacity: interpolate(frame, [0, 16, 42], [0, 0.7, 0.35], clamp),
      }} />
      {[0, 1, 2, 3].map((corner) => (
        <div key={corner} style={{
          position: 'absolute',
          left: corner % 2 ? undefined : '7.5%',
          right: corner % 2 ? '7.5%' : undefined,
          top: corner < 2 ? height * 0.19 : height * 0.72,
          width: 36, height: 36,
          borderTop: corner < 2 ? '2px solid ' + accent : undefined,
          borderBottom: corner >= 2 ? '2px solid ' + accent : undefined,
          borderLeft: corner % 2 === 0 ? '2px solid ' + accent : undefined,
          borderRight: corner % 2 === 1 ? '2px solid ' + accent : undefined,
          opacity: 0.72,
        }} />
      ))}
    </AbsoluteFill>
  );
};

const ProgressiveCard: React.FC<{ accent: string; label: string; sceneText: string; metric: string | null }> = ({ accent, label, sceneText, metric }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const landscape = width > height;
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 150, mass: 0.7 } });
  const x = interpolate(enter, [0, 1], [landscape ? 95 : 72, 0]);
  const main = String(metric || sceneText || label).replace(/\s+/g, ' ').trim().slice(0, 74);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        left: landscape ? '62%' : '8%',
        right: landscape ? '7%' : '8%',
        bottom: landscape ? '15%' : '27%',
        minHeight: landscape ? 108 : 126,
        padding: landscape ? '18px 24px' : '20px 22px',
        background: 'linear-gradient(115deg,#07111DED,#101D2BE8)',
        borderLeft: '4px solid ' + accent,
        borderTop: '1px solid ' + accent + '77',
        boxShadow: '0 22px 70px #0009, 0 0 28px ' + accent + '22',
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: 'translateX(' + x + 'px)',
      }}>
        <div style={{ color: accent, fontSize: landscape ? 14 : 15, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>
          {label || 'EM FOCO'}
        </div>
        <div style={{
          marginTop: 8, color: '#FFFFFF', fontSize: landscape ? 24 : 25, lineHeight: 1.12,
          fontWeight: 850, letterSpacing: -0.5,
        }}>{main || 'Detalhe do produto'}</div>
        <div style={{ marginTop: 12, width: '100%', height: 2, background: '#FFFFFF22', overflow: 'hidden' }}>
          <div style={{ width: (enter * 100) + '%', height: '100%', background: accent, boxShadow: '0 0 14px ' + accent }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScanlineFocus: React.FC<{ accent: string; label: string }> = ({ accent, label }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const y = interpolate(frame % 72, [0, 71], [height * 0.28, height * 0.68], clamp);
  const opacity = interpolate(frame % 72, [0, 10, 60, 71], [0.1, 0.82, 0.82, 0.1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: '9%', right: '9%', top: y, height: 2,
        background: 'linear-gradient(90deg,transparent,' + accent + ',#FFFFFF,' + accent + ',transparent)',
        boxShadow: '0 0 26px ' + accent, opacity,
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: y - 25, width: 50, height: 50,
        border: '1px solid ' + accent + 'AA', borderRadius: '50%',
        transform: 'translateX(-50%)', opacity,
      }}>
        <div style={{ position: 'absolute', left: '50%', top: -7, bottom: -7, width: 1, background: accent, opacity: 0.85 }} />
        <div style={{ position: 'absolute', top: '50%', left: -7, right: -7, height: 1, background: accent, opacity: 0.85 }} />
      </div>
      <div style={{
        position: 'absolute', right: '9%', top: y + 13, color: '#FFFFFF', fontSize: 12,
        fontWeight: 900, letterSpacing: 2, textShadow: '0 2px 10px #000',
        opacity: opacity * 0.9,
      }}>{String(label || 'DETALHE').toUpperCase().slice(0, 26)}</div>
      <div style={{ position: 'absolute', left: width * 0.12, right: width * 0.12, top: y + 24, height: height * 0.14, background: 'linear-gradient(180deg,' + accent + '12,transparent)', opacity }} />
    </AbsoluteFill>
  );
};

const MetricFrame: React.FC<{ accent: string; label: string; metric: string | null }> = ({ accent, label, metric }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 125 } });
  const value = String(metric || label || 'INFORMAÇÃO').slice(0, 42);
  const travel = interpolate(frame, [0, 36], [width * 0.08, width * 0.92], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: height * 0.43,
        height: 1, background: 'linear-gradient(90deg,transparent,' + accent + '99,transparent)',
        opacity: enter * 0.72,
      }} />
      <div style={{
        position: 'absolute', left: travel, top: height * 0.43 - 5,
        width: 10, height: 10, borderRadius: '50%', background: accent,
        boxShadow: '0 0 20px ' + accent, opacity: enter,
      }} />
      <div style={{
        position: 'absolute', left: '9%', right: '9%', top: height * 0.61, padding: '14px 20px',
        background: '#07111DE8', borderLeft: '4px solid ' + accent, color: '#FFFFFF',
        fontSize: width > height ? 25 : 26, fontWeight: 900,
        transform: 'translateY(' + interpolate(enter, [0, 1], [24, 0]) + 'px)',
        boxShadow: '0 18px 44px #0008',
      }}>
        <span style={{ color: accent, display: 'block', fontSize: 13, letterSpacing: 3 }}>{metric ? 'DADO DA CENA' : 'PONTO EM FOCO'}</span>
        <span>{value}</span>
      </div>
    </AbsoluteFill>
  );
};

const RhythmicAccents: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const beatFrame = frame % 48;
  const pulse = Math.max(0, 1 - Math.min(beatFrame, 48 - beatFrame) / 5);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, border: '8px solid ' + accent, opacity: pulse * 0.32 }} />
      {[0, 1, 2].map((index) => (
        <div key={index} style={{
          position: 'absolute', left: 0, top: height * (0.32 + index * 0.13), width: width * 0.12,
          height: 4, background: accent, boxShadow: '0 0 18px ' + accent,
          transform: 'translateX(' + interpolate(frame, [index * 5, index * 5 + 12], [-width * 0.2, width * 0.08], clamp) + 'px)',
          opacity: pulse,
        }} />
      ))}
    </AbsoluteFill>
  );
};

const FlyingWords: React.FC<{ accent: string; sceneText: string }> = ({ accent, sceneText }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const words = String(sceneText || '').replace(/[.,!?;:]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3);
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 190, mass: 0.6 } });
  if (!words.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: width > height ? 16 : 10, maxWidth: '88%' }}>
        {words.map((word, index) => (
          <span key={index} style={{
            color: index === words.length - 1 ? accent : '#FFFFFF',
            fontSize: width > height ? 58 : 68, fontWeight: 1000, lineHeight: 0.94,
            letterSpacing: -3, textTransform: 'uppercase',
            textShadow: '0 10px 40px #000D',
            transform: 'translate3d(' + interpolate(enter, [0, 1], [(index % 2 ? 1 : -1) * 115, 0]) + 'px,' + interpolate(frame, [index * 4, index * 4 + 12], [height * 0.16, 0], clamp) + 'px,0) scale(' + interpolate(enter, [0, 1], [0.7, 1]) + ')',
            opacity: interpolate(frame, [index * 4, index * 4 + 10], [0, 1], clamp),
          }}>{word}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const LightSweep: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const x = interpolate(frame, [0, 54], [-width * 0.7, width * 1.2], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: height * 0.2, bottom: height * 0.18, width: width * 0.22,
        left: x, transform: 'skewX(-18deg)',
        background: 'linear-gradient(90deg,transparent,' + accent + '25,#FFFFFF35,' + accent + '24,transparent)',
        filter: 'blur(8px)',
      }} />
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: height * 0.2, height: 1, background: accent + '66', opacity: 0.4 }} />
    </AbsoluteFill>
  );
};

export const ShotcraftRecipeRenderer: React.FC<Props> = (props) => {
  switch (props.recipeId) {
    case 'spotlight-hero-card': return <SpotlightHero accent={props.accent} />;
    case 'product-card-progressive-assemble': return <ProgressiveCard accent={props.accent} label={props.label} sceneText={props.sceneText} metric={props.metric} />;
    case 'scanline-annotate-focus': return <ScanlineFocus accent={props.accent} label={props.label} />;
    case 'chart-live-moves': return <MetricFrame accent={props.accent} label={props.label} metric={props.metric} />;
    case 'beat-cut-moves': return <RhythmicAccents accent={props.accent} />;
    case 'flying-words': return <FlyingWords accent={props.accent} sceneText={props.sceneText} />;
    case 'light-play-moves': return <LightSweep accent={props.accent} />;
    default: return null;
  }
};
