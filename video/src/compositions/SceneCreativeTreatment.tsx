import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeMotionGraphicsScene, type ThreeMotionVariant } from '../motion-graphics/ThreeMotionGraphicsScene';
import { SHORTS_SAFE_ZONE } from '../utils/shorts-safe-zone';

export type SceneCreativeDirection = {
  sceneId: string | number;
  narrativeBeat: string;
  primaryTemplate: string;
  supportTemplates: string[];
  templateIds: string[];
  templateNames: string[];
  transitionIn: string;
  energy: string;
  rhythmSeconds: number;
  visualLayers: string[];
  assets: {
    realProductImage: boolean;
    galleryCutaway: boolean;
    lifestyleFootage: boolean;
    brollAvailable: boolean;
    dataMustComeFromScene: boolean;
  };
  artDirection: string;
  renderPlan?: {
    version: number;
    renderer: string;
    shotType: string;
    action: string;
    cameraMove: string;
    productProfile: string;
    productRepresentation: string;
    assetRequirement: string;
    hasMatchedBroll: boolean;
    usesTrueProductGeometry: boolean;
    visualFidelity: string;
    fallbackReason: string | null;
  };
};

type Props = {
  plan?: SceneCreativeDirection;
  accent: string;
  label: string;
  sceneText: string;
  metric: string | null;
};

function includes(plan: SceneCreativeDirection, id: string) {
  return plan.templateIds.includes(id);
}

function pickThreeVariant(plan: SceneCreativeDirection): ThreeMotionVariant | null {
  if (includes(plan, 'exploded-teardown')) return 'exploded';
  if (includes(plan, 'hologram-hud')) return 'hud';
  if (includes(plan, 'isometric-explainer')) return 'isometric';
  if (includes(plan, 'premium-product-3d')) return 'orbit';
  return null;
}

function emphasisText(label: string, sceneText: string, metric: string | null) {
  if (metric) return metric;
  const source = String(label || sceneText || '').replace(/[.,!?;:]/g, ' ').trim();
  const words = source.split(/\s+/).filter(Boolean).slice(0, 3);
  return words.join(' ').toUpperCase();
}

const SceneTransition: React.FC<{ kind: string; accent: string }> = ({ kind, accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame >= 18) return null;
  const progress = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fade = interpolate(frame, [0, 11, 18], [1, 0.9, 0], { extrapolateRight: 'clamp' });
  const common: React.CSSProperties = {
    position: 'absolute', pointerEvents: 'none', opacity: fade,
  };

  if (kind === 'arena-slam') {
    const left = interpolate(frame, [0, 8, 18], [-100, 0, 0], { extrapolateRight: 'clamp' });
    const right = interpolate(frame, [0, 8, 18], [100, 0, 0], { extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={common}>
        <div style={{ position: 'absolute', inset: '0 50% 0 0', background: accent, transform: 'translateX(' + left + '%)' }} />
        <div style={{ position: 'absolute', inset: '0 0 0 50%', background: '#080C14', borderLeft: '3px solid ' + accent, transform: 'translateX(' + right + '%)' }} />
      </AbsoluteFill>
    );
  }
  if (kind === 'component-snap') {
    return (
      <AbsoluteFill style={common}>
        {[0, 1, 2].map((index) => (
          <div key={index} style={{
            position: 'absolute', left: 0, right: 0, top: height * (0.32 + index * 0.18), height: 3,
            background: accent, boxShadow: '0 0 26px ' + accent,
            transform: 'translateX(' + interpolate(frame, [0, 8], [index % 2 ? width * 1.1 : -width * 1.1, 0], { extrapolateRight: 'clamp' }) + 'px)',
          }} />
        ))}
      </AbsoluteFill>
    );
  }
  if (kind === 'scan-reveal') {
    return (
      <AbsoluteFill style={common}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 180,
          left: interpolate(frame, [0, 18], [-180, width], { extrapolateRight: 'clamp' }),
          background: 'linear-gradient(90deg,transparent,' + accent + '66,transparent)',
          boxShadow: '0 0 65px ' + accent,
        }} />
      </AbsoluteFill>
    );
  }
  if (kind === 'data-wipe') {
    return (
      <AbsoluteFill style={common}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} style={{
            position: 'absolute', left: 0, right: 0, height: height * 0.09,
            top: height * (0.3 + index * 0.16), background: accent,
            transform: 'translateX(' + interpolate(frame, [0, 10], [index % 2 ? width : -width, 0], { extrapolateRight: 'clamp' }) + 'px)',
          }} />
        ))}
      </AbsoluteFill>
    );
  }
  if (kind === 'word-swipe' || kind === 'cinematic-wipe' || kind === 'layered-wipe') {
    return (
      <AbsoluteFill style={common}>
        <div style={{
          position: 'absolute', inset: -160, background: 'linear-gradient(105deg,transparent 28%,' + accent + ' 48%,#FFFFFF 50%,' + accent + ' 52%,transparent 72%)',
          transform: 'translateX(' + interpolate(frame, [0, 18], [-width * 1.2, width * 1.2], { extrapolateRight: 'clamp' }) + 'px) skewX(-12deg)',
        }} />
      </AbsoluteFill>
    );
  }
  if (kind === 'match-cut') {
    return (
      <AbsoluteFill style={{
        ...common,
        background: 'radial-gradient(circle at 50% 50%,' + accent + ' 0%,transparent ' + interpolate(frame, [0, 18], [0, 95], { extrapolateRight: 'clamp' }) + '%)',
      }} />
    );
  }
  return (
    <AbsoluteFill style={{
      ...common,
      background: 'linear-gradient(115deg,transparent 20%,' + accent + '66 50%,transparent 80%)',
      transform: 'translateX(' + interpolate(progress, [0, 1], [-width, width]) + 'px)',
    }} />
  );
};

/**
 * Combines the lead template with supporting visual techniques on each scene.
 * It is deliberately an overlay: the existing image gallery, real B-roll, narration,
 * subtitles and validated beat timing remain the underlying production system.
 */
export const SceneCreativeTreatment: React.FC<Props> = ({ plan, accent, label, sceneText, metric }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!plan) return null;

  const variant = plan.renderPlan?.renderer === 'three-product' ? null : pickThreeVariant(plan);
  const threeOpacity = interpolate(frame, [0, 10, 26], [0, 0.9, 0.58], { extrapolateRight: 'clamp' });
  const entrance = spring({ frame, fps, config: { damping: 13, stiffness: 180, mass: 0.65 } });
  const titleScale = interpolate(entrance, [0, 1], [0.72, 1]);
  const titleX = interpolate(frame, [0, 14], [80, 0], { extrapolateRight: 'clamp' });
  const punch = emphasisText(label, sceneText, metric);
  const landscape = width > height;
  const hudBox = landscape
    ? { left: width * 0.43, top: height * 0.18, width: width * 0.49, height: height * 0.66 }
    : { left: 76, top: 610, width: 820, height: 620 };
  const kineticBox = landscape
    ? { left: width * 0.49, right: width * 0.08, top: height * 0.66 }
    : { left: 78, right: 190, top: 1035 };
  const editorialFrame = landscape
    ? { left: width * 0.035, right: width * 0.075, top: height * 0.16, bottom: height * 0.13 }
    : { left: 48, right: 190, top: 565, bottom: 385 };
  const cinematicCircle = landscape
    ? { left: width * 0.42 - height * 0.45, top: height * 0.05, size: height * 0.9 }
    : { left: -260, top: 590, size: 940 };
  const showKinetic = includes(plan, 'kinetic-typography');
  const showHud = includes(plan, 'hologram-hud');
  const showCinematic = includes(plan, 'cinematic-2d');
  const showComparison = includes(plan, 'comparison-arena');
  const showEditorial = includes(plan, 'editorial-luxury');
  const showIsometric = includes(plan, 'isometric-explainer');
  const showData = includes(plan, 'data-storytelling');

  const safeOverlay = landscape
    ? undefined
    : 'inset(' + SHORTS_SAFE_ZONE.top + 'px ' +
      (width - SHORTS_SAFE_ZONE.right) + 'px ' +
      (height - SHORTS_SAFE_ZONE.bottom) + 'px ' +
      SHORTS_SAFE_ZONE.left + 'px)';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', clipPath: safeOverlay }}>
      {variant ? (
        <AbsoluteFill style={{ opacity: threeOpacity }}>
          <ThreeMotionGraphicsScene variant={variant} accentColor={accent} />
        </AbsoluteFill>
      ) : null}

      {showCinematic ? (
        <>
          <div style={{
            position: 'absolute', left: cinematicCircle.left, top: cinematicCircle.top, width: cinematicCircle.size, height: cinematicCircle.size, borderRadius: cinematicCircle.size,
            border: '1px solid ' + accent + '55',
            transform: 'translate(' + (Math.sin(frame / 22) * 26) + 'px,' + (Math.cos(frame / 25) * 18) + 'px) scale(' + (1 + Math.sin(frame / 34) * 0.035) + ')',
            boxShadow: '0 0 110px ' + accent + '22',
          }} />
          <div style={{
            position: 'absolute', top: landscape ? height * 0.12 : 560, bottom: landscape ? height * 0.1 : 380, left: 0, right: 0,
            background: 'linear-gradient(115deg,transparent 25%, ' + accent + '16 50%, transparent 72%)',
            transform: 'translateX(' + (interpolate(frame, [0, 80], [-520, 520], { extrapolateRight: 'clamp' })) + 'px)',
          }} />
        </>
      ) : null}

      {showHud ? (
        <div style={{
          position: 'absolute', left: hudBox.left, top: hudBox.top, width: hudBox.width, height: hudBox.height,
          border: '1px solid ' + accent + '88',
          boxShadow: 'inset 0 0 45px ' + accent + '16, 0 0 24px ' + accent + '22',
          clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)',
        }}>
          <div style={{ position: 'absolute', left: 18, top: 16, color: accent, fontSize: 18, fontWeight: 900, letterSpacing: 4 }}>LIVE SPEC DATA</div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: interpolate(frame % 54, [0, 54], [45, 590]),
            height: 2, background: accent, opacity: 0.55, boxShadow: '0 0 20px ' + accent,
          }} />
          <div style={{ position: 'absolute', right: 24, bottom: 22, color: '#FFFFFF', fontSize: 18, letterSpacing: 3 }}>VETOR / ANALYSIS</div>
        </div>
      ) : null}

      {showIsometric ? (
        <div style={{
          position: 'absolute', left: landscape ? width * 0.48 : 125, top: landscape ? height * 0.36 : 710, width: landscape ? width * 0.44 : 720, height: landscape ? height * 0.42 : 410,
          backgroundImage: 'linear-gradient(30deg,' + accent + '38 1px,transparent 1px),linear-gradient(150deg,' + accent + '38 1px,transparent 1px)',
          backgroundSize: '42px 24px',
          transform: 'perspective(700px) rotateX(58deg) rotateZ(-4deg)',
          opacity: 0.5,
          maskImage: 'linear-gradient(180deg,transparent,#000 18%,#000 82%,transparent)',
        }} />
      ) : null}

      {showComparison ? (
        <>
          <div style={{ position: 'absolute', top: landscape ? height * 0.18 : 600, bottom: landscape ? height * 0.18 : 400, left: '50%', width: 3, background: accent, boxShadow: '0 0 24px ' + accent }} />
          <div style={{ position: 'absolute', top: landscape ? height * 0.2 : 610, left: 'calc(50% - 48px)', width: 96, height: 48, borderRadius: 24, background: accent, color: '#080C14', textAlign: 'center', lineHeight: '48px', fontSize: 20, fontWeight: 1000 }}>VS</div>
        </>
      ) : null}

      {showData && metric ? (
        <div style={{
          position: 'absolute', right: landscape ? width * 0.1 : 190, top: landscape ? height * 0.25 : 645, padding: '12px 18px',
          borderLeft: '3px solid ' + accent, background: '#07111DD9',
          color: accent, fontSize: 24, fontWeight: 900, letterSpacing: 2,
          transform: 'translateY(' + (Math.sin(frame / 8) * 4) + 'px)',
        }}>
          DADO CONFIRMADO <span style={{ color: '#FFFFFF', display: 'block', fontSize: 42, letterSpacing: -1 }}>{metric}</span>
        </div>
      ) : null}

      {showKinetic ? (
        <div style={{
          position: 'absolute', left: kineticBox.left, right: kineticBox.right, top: kineticBox.top,
          color: '#FFFFFF', fontSize: 64, lineHeight: 0.98, fontWeight: 1000,
          letterSpacing: -3, textTransform: 'uppercase',
          textShadow: '0 8px 36px rgba(0,0,0,.8), 0 0 30px ' + accent + '55',
          transform: 'translateX(' + titleX + 'px) scale(' + titleScale + ')',
          transformOrigin: 'left center',
        }}>
          <span style={{ color: accent }}>{punch}</span>
        </div>
      ) : null}

      {showEditorial ? (
        <div style={{
          position: 'absolute', left: editorialFrame.left, right: editorialFrame.right, top: editorialFrame.top, bottom: editorialFrame.bottom,
          borderTop: '1px solid ' + accent + '88', borderBottom: '1px solid ' + accent + '88',
          opacity: 0.48,
        }} />
      ) : null}

      <SceneTransition kind={plan.transitionIn} accent={accent} />
    </AbsoluteFill>
  );
};
