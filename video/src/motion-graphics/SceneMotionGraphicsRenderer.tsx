import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SHORTS_SAFE_ZONE } from '../utils/shorts-safe-zone';
import { LANDSCAPE_OVERLAY_SAFE_ZONE } from '../utils/landscape-safe-zone';
import { fitHeadlineSize, truncateHeadline } from '../utils/scene-headline';

type Props = { template: string; accent: string; label: string; sceneText: string; metric: string | null };

const KineticType: React.FC<Props> = ({ label, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const landscape = width > height;
  const safe = landscape ? LANDSCAPE_OVERLAY_SAFE_ZONE : SHORTS_SAFE_ZONE;
  const safeWidth = safe.right - safe.left;
  const safeHeight = safe.bottom - safe.top;
  const insetX = safeWidth * 0.06;
  const text = truncateHeadline(label || 'O DETALHE IMPORTA', landscape ? 40 : 32);
  const words = text.split(/\s+/).filter(Boolean);
  const fontSize = fitHeadlineSize(text, {
    width: safeWidth * 0.86,
    maxHeight: landscape ? 250 : 330,
    maxSize: landscape ? 82 : 96,
    minSize: 50,
    lineHeight: 0.98,
    charWidthRatio: 0.62,
  });
  const contentLeft = safe.left + insetX;
  const contentRight = safe.right - insetX;
  const headlineTop = safe.top + safeHeight * 0.17;
  const headlineBottom = safe.bottom - safeHeight * 0.17;
  const lineTop = safe.top + safeHeight * 0.49;
  const lowerRuleTop = safe.top + safeHeight * 0.82;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        left: contentLeft,
        right: width - contentRight,
        top: lineTop,
        height: landscape ? 5 : 7,
        background: accent,
        opacity: .9,
        transform: 'scaleX(' + interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' }) + ')',
        boxShadow: '0 0 42px ' + accent,
      }} />
      <div style={{
        position: 'absolute',
        left: contentLeft,
        right: width - contentRight,
        top: headlineTop,
        bottom: height - headlineBottom,
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        gap: landscape ? '0 18px' : '0 13px',
        perspective: 900,
        overflow: 'hidden',
      }}>
        {words.map((word, index) => {
          const amount = spring({ frame: frame - index * 4, fps, config: { damping: 10, stiffness: 190, mass: .62 } });
          return (
            <span key={index} style={{
              display: 'inline-block',
              flex: '0 0 auto',
              maxWidth: '100%',
              color: index % 2 === 0 ? '#FFFFFF' : accent,
              fontSize,
              lineHeight: .94,
              fontWeight: 1000,
              letterSpacing: landscape ? -3 : -4,
              textTransform: 'uppercase',
              textShadow: '0 14px 50px rgba(0,0,0,.8)',
              whiteSpace: 'nowrap',
              transform: 'translateY(' + interpolate(amount, [0, 1], [100, 0]) + 'px) rotateX(' + interpolate(amount, [0, 1], [65, 0]) + 'deg) scale(' + interpolate(amount, [0, 1], [.65, 1]) + ')',
              opacity: amount,
            }}>{word}</span>
          );
        })}
      </div>
      <div style={{
        position: 'absolute',
        left: contentLeft,
        right: width - contentRight,
        top: lowerRuleTop,
        height: 2,
        background: accent,
        opacity: .55,
      }} />
    </AbsoluteFill>
  );
};

const DataStory: React.FC<Props> = ({ label, metric, accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const landscape = width > height;
  const value = metric || label;
  const reveal = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const bars = [38, 62, 47, 84, 58, 72, 45];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: landscape ? '72%' : '82%', height: landscape ? '44%' : '32%', border: '1px solid ' + accent + '66', transform: 'perspective(700px) rotateX(58deg) rotateZ(-8deg) scale(' + (.75 + reveal * .25) + ')', boxShadow: '0 0 80px ' + accent + '22' }} />
      <div style={{ position: 'absolute', bottom: landscape ? '23%' : '30%', left: '12%', right: '12%', display: 'flex', alignItems: 'end', justifyContent: 'center', gap: landscape ? 22 : 14, height: landscape ? '26%' : '19%' }}>
        {bars.map((bar, index) => <div key={index} style={{ width: landscape ? 24 : 18, height: bar * reveal + '%', background: 'linear-gradient(180deg,' + accent + ',#FFFFFF33)', boxShadow: '0 0 22px ' + accent + '55', transform: 'skewY(-8deg)' }} />)}
      </div>
      <div style={{ position: 'relative', maxWidth: '86%', padding: landscape ? '20px 34px' : '26px 30px', background: '#07111DEB', borderLeft: '7px solid ' + accent, boxShadow: '0 28px 100px #000A', transform: 'translateY(' + interpolate(frame, [0, 20], [90, 0], { extrapolateRight: 'clamp' }) + 'px) scale(' + interpolate(frame, [0, 20], [.86, 1], { extrapolateRight: 'clamp' }) + ')', opacity: reveal }}>
        <div style={{ color: accent, fontSize: landscape ? 22 : 20, fontWeight: 950, letterSpacing: 5 }}>DADO EM DESTAQUE</div>
        <div style={{ color: '#FFFFFF', marginTop: 10, fontSize: landscape ? 76 : 92, fontWeight: 1000, lineHeight: .98, letterSpacing: -4 }}>{value}</div>
      </div>
    </AbsoluteFill>
  );
};

const ComparisonArena: React.FC<Props> = ({ label, sceneText, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const landscape = width > height;
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 170 } });
  const split = interpolate(enter, [0, 1], [0, 50]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: .88 }}>
        <div style={{ width: split + '%', background: 'linear-gradient(135deg,#1C3557,#080C14)', transform: 'skewX(-8deg) translateX(-4%)' }} />
        <div style={{ flex: 1, background: 'linear-gradient(225deg,#4A2428,#080C14)', transform: 'skewX(-8deg) translateX(4%)' }} />
      </div>
      <div style={{ position: 'absolute', left: '50%', top: landscape ? '22%' : '29%', bottom: landscape ? '22%' : '31%', width: 4, background: accent, boxShadow: '0 0 36px ' + accent, transform: 'translateX(-50%) scaleY(' + enter + ')' }} />
      <div style={{ position: 'absolute', left: landscape ? '12%' : '9%', right: landscape ? '12%' : '9%', top: landscape ? '34%' : '37%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#FFFFFF', fontSize: landscape ? 34 : 30, fontWeight: 950, letterSpacing: 3 }}>OPÇÃO A</div>
        <div style={{ color: accent, fontSize: landscape ? 70 : 76, fontWeight: 1000, textShadow: '0 0 34px ' + accent }}>VS</div>
        <div style={{ color: '#FFFFFF', fontSize: landscape ? 34 : 30, fontWeight: 950, letterSpacing: 3 }}>OPÇÃO B</div>
      </div>
      <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: landscape ? '20%' : '24%', padding: '18px 24px', color: '#FFFFFF', background: '#080C14E8', borderBottom: '3px solid ' + accent, textAlign: 'center', fontSize: landscape ? 28 : 25, fontWeight: 800, lineHeight: 1.15, opacity: enter }}>{label || sceneText}</div>
    </AbsoluteFill>
  );
};

export const SceneMotionGraphicsRenderer: React.FC<Props> = (props) => {
  if (props.template === 'kinetic-typography') return <KineticType {...props} />;
  if (props.template === 'data-storytelling') return <DataStory {...props} />;
  if (props.template === 'comparison-arena') return <ComparisonArena {...props} />;
  return null;
};
