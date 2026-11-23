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
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 145, mass: 0.72 } });
  const source = String(metric || sceneText || label).replace(/\s+/g, ' ').trim();
  const compact = source.split(' ').slice(0, 5).join(' ');
  const main = String(metric || compact || label || 'Destaque da cena').slice(0, 52);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        right: landscape ? '7%' : '8%',
        bottom: landscape ? '13%' : '26%',
        width: 'fit-content',
        maxWidth: landscape ? '42%' : '78%',
        boxSizing: 'border-box',
        padding: landscape ? '12px 16px' : '14px 18px',
        background: 'linear-gradient(115deg,rgba(7,17,29,.94),rgba(16,29,43,.88))',
        borderLeft: '3px solid ' + accent,
        borderTop: '1px solid ' + accent + '66',
        borderRadius: 8,
        boxShadow: '0 12px 34px #0008',
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: 'translate3d(' + interpolate(enter, [0, 1], [26, 0]) + 'px,0,0)',
      }}>
        <div style={{
          color: accent, fontSize: landscape ? 11 : 12, fontWeight: 900,
          letterSpacing: 2.4, textTransform: 'uppercase',
        }}>{metric ? 'DADO DA CENA' : 'EM FOCO'}</div>
        <div style={{
          marginTop: 5, color: '#FFFFFF',
          fontSize: landscape ? 18 : 21, lineHeight: 1.12,
          fontWeight: 850, letterSpacing: -0.25,
          overflowWrap: 'anywhere',
        }}>{main}</div>
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
  const { width, fps } = useVideoConfig();
  const landscape = width > useVideoConfig().height;
  const enter = spring({ frame, fps, config: { damping: 19, stiffness: 135 } });
  const value = String(metric || label || 'INFORMAÇÃO').replace(/\s+/g, ' ').trim().slice(0, 48);
  const reveal = interpolate(frame, [0, 22], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', right: landscape ? '7%' : '8%',
        bottom: landscape ? '13%' : '26%',
        width: 'fit-content', maxWidth: landscape ? '38%' : '76%',
        padding: landscape ? '12px 16px' : '14px 18px',
        boxSizing: 'border-box',
        background: '#07111DEB',
        border: '1px solid ' + accent + '66',
        borderLeft: '3px solid ' + accent,
        borderRadius: 8,
        boxShadow: '0 12px 36px #0008',
        opacity: enter,
        transform: 'translateY(' + interpolate(enter, [0, 1], [20, 0]) + 'px)',
      }}>
        <div style={{
          color: accent, fontSize: landscape ? 11 : 12, fontWeight: 900,
          letterSpacing: 2.3,
        }}>{metric ? 'VALOR INFORMADO' : 'INFORMAÇÃO DA CENA'}</div>
        <div style={{
          marginTop: 6, color: '#FFFFFF', fontSize: landscape ? 19 : 22,
          lineHeight: 1.12, fontWeight: 900, overflowWrap: 'anywhere',
        }}>{value}</div>
        <div style={{ marginTop: 9, height: 2, background: '#FFFFFF22', overflow: 'hidden' }}>
          <div style={{ width: (reveal * 100) + '%', height: '100%', background: accent, boxShadow: '0 0 12px ' + accent }} />
        </div>
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

const FlyingWords: React.FC<{ accent: string; sceneText: string; label: string }> = ({ accent, sceneText, label }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const landscape = width > height;
  const source = String(label || sceneText || '').replace(/[.,!?;:]/g, ' ').trim();
  const words = source.split(/\s+/).filter(Boolean);
  const stopWords = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com', 'um', 'uma', 'que', 'se', 'no', 'na', 'nos', 'nas']);
  const punch = [...words].reverse().find((word) => !stopWords.has(word.toLowerCase())) || words[0];
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 165, mass: 0.7 } });
  if (!punch) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', right: landscape ? '8%' : '8%',
        bottom: landscape ? '16%' : '28%',
        display: 'flex', alignItems: 'center',
        padding: landscape ? '9px 15px' : '12px 18px',
        border: '1px solid ' + accent + '99',
        borderRadius: 999,
        background: 'rgba(7,17,29,.88)',
        boxShadow: '0 8px 28px #0008, 0 0 22px ' + accent + '22',
        color: '#FFFFFF',
        fontSize: landscape ? 18 : 24,
        fontWeight: 950,
        letterSpacing: landscape ? 2 : 2.8,
        lineHeight: 1,
        textTransform: 'uppercase',
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: 'translate3d(' + interpolate(enter, [0, 1], [24, 0]) + 'px,0,0)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, background: accent, marginRight: 10, boxShadow: '0 0 12px ' + accent }} />
        {punch.slice(0, 18)}
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
    case 'flying-words': return <FlyingWords accent={props.accent} sceneText={props.sceneText} label={props.label} />;
    case 'light-play-moves': return <LightSweep accent={props.accent} />;
    default: return null;
  }
};
