import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { SceneBeat, SceneMotionPreset } from '../utils/visual-storyboard';
import { fonts } from '../styles/fonts';
import { resolveMediaSource } from '../utils/media-source';
import { SHORTS_STAGE } from '../utils/shorts-safe-zone';
import { SceneProductStage3D, type ProductModelProfile, type ProductShot } from '../motion-graphics/SceneProductStage3D';
import type { SceneCreativeDirection } from '../compositions/SceneCreativeTreatment';

/**
 * Vertical (Shorts) stage for one beat. Rendered inside a <Sequence> that starts at the
 * beat, so useCurrentFrame() is the frame within the beat and every beat gets its own
 * punchy entrance.
 *
 * Geometry is tuned for the YouTube Shorts UI (1080x1920): the headline lives above the
 * stage, captions below it, and nothing important sits in the right-hand button column.
 */
// Centred in the YouTube Shorts safe column (60px left, 160px right => x 60..920) with room
// for the landing and zoom animations, so no frame of the product reaches into the Shorts UI.
export const STAGE = SHORTS_STAGE;

type BeatStageProps = {
  beat: SceneBeat;
  images: string[];
  brollUrl?: string;
  metric: string | null;
  metricLabel: string;
  accent: string;
  motion: SceneMotionPreset;
  creativeDirection?: SceneCreativeDirection;
  productModelUrl?: string;
};

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

const ProductBox: React.FC<{
  src: string;
  scale?: number;
  x?: number;
  y?: number;
  rotate?: number;
  originX?: number;
  originY?: number;
  opacity?: number;
  box?: { left: number; top: number; width: number; height: number };
}> = ({ src, scale = 1, x = 0, y = 0, rotate = 0, originX = 0.5, originY = 0.5, opacity = 1, box = STAGE }) => (
  <Img
    src={resolveMediaSource(src)}
    style={{
      position: 'absolute',
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      objectFit: 'contain',
      opacity,
      transformOrigin: `${originX * 100}% ${originY * 100}%`,
      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 38px 52px rgba(0,0,0,.55))',
    }}
  />
);

export const BeatStage: React.FC<BeatStageProps> = ({ beat, images, brollUrl, metric, metricLabel, accent, motion, creativeDirection, productModelUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const length = Math.max(1, beat.endFrame - beat.startFrame);
  const progress = Math.min(1, Math.max(0, frame / length));
  const main = images[0];
  const renderPlan = creativeDirection?.renderPlan;
  if (renderPlan?.renderer === 'three-product' && beat.kind !== 'callout' && beat.kind !== 'broll') {
    const shot: ProductShot = renderPlan.shotType.includes('exploded')
      ? 'exploded'
      : beat.kind === 'detail' || renderPlan.shotType.includes('macro')
        ? 'macro'
        : 'hero';
    return (
      <SceneProductStage3D
        profile={(renderPlan.productProfile || 'unresolved') as ProductModelProfile}
        shot={shot}
        cameraMove={renderPlan.cameraMove}
        accent={accent}
        modelUrl={productModelUrl}
        durationFrames={length}
      />
    );
  }

  // Overshooting spring: the product "lands" instead of just fading in.
  const land = spring({ frame, fps, durationInFrames: 16, config: { damping: 13, stiffness: 170, mass: 0.7 } });
  const slide = interpolate(frame, [0, 12], [0, 1], { easing: ease, extrapolateRight: 'clamp' });
  // AI visualIntent drives the real product-camera move, not just a text label.
  const cameraX = motion === 'pan-left'
    ? interpolate(progress, [0, 1], [24, -24])
    : motion === 'pan-right'
      ? interpolate(progress, [0, 1], [-24, 24])
      : 0;
  const cameraY = motion === 'float' ? Math.sin(progress * Math.PI * 2) * 12 : 0;
  const cameraRotate = motion === 'tilt-left'
    ? interpolate(progress, [0, 1], [1.8, -1.8])
    : motion === 'tilt-right'
      ? interpolate(progress, [0, 1], [-1.8, 1.8])
      : 0;
  const cameraScale = motion === 'push-in'
    ? interpolate(progress, [0, 1], [1, 1.075])
    : interpolate(progress, [0, 1], [1.025, 1]);

  if (beat.kind === 'detail') {
    // Macro push-in towards a point of the product.
    const zoom = interpolate(progress, [0, 1], [1.4, 1.62], { easing: Easing.inOut(Easing.quad) });
    // The zoom is clipped to the stage window, so it reads as a macro lens and never
    // spills over the headline or the captions.
    return (
      <div
        style={{
          position: 'absolute',
          left: STAGE.left,
          top: STAGE.top,
          width: STAGE.width,
          height: STAGE.height,
          overflow: 'hidden',
          borderRadius: 44,
          border: '2px solid rgba(112,196,255,.28)',
          boxShadow: '0 24px 70px rgba(0,0,0,.4)',
        }}
      >
        <ProductBox
          src={main}
          box={{ left: 0, top: 0, width: STAGE.width, height: STAGE.height }}
          scale={zoom * cameraScale}
          x={cameraX}
          y={cameraY}
          rotate={cameraRotate}
          originX={beat.focusX}
          originY={beat.focusY}
          opacity={interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' })}
        />
      </div>
    );
  }

  if (beat.kind === 'gallery') {
    const src = images[beat.imageIndex % images.length] || main;
    // Fade + scale in (no sideways slide: the slide would cross the Shorts UI margins).
    return (
      <ProductBox
        src={src}
        scale={interpolate(slide, [0, 1], [0.92, 1]) * interpolate(progress, [0, 1], [1.0, 1.03]) * cameraScale}
        x={cameraX}
        y={cameraY}
        rotate={interpolate(slide, [0, 1], [-1.5, 0]) + cameraRotate}
        opacity={interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' })}
      />
    );
  }

  if (beat.kind === 'callout' && metric) {
    const cardScale = interpolate(land, [0, 1], [0.6, 1]);
    const small = metric.length > 9;
    return (
      <>
        <ProductBox
          src={main}
          scale={interpolate(progress, [0, 1], [0.72, 0.78]) * cameraScale}
          x={cameraX}
          y={72 + cameraY}
          rotate={cameraRotate}
          opacity={interpolate(frame, [0, 6], [0, 0.92], { extrapolateRight: 'clamp' })}
        />
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 590,
            padding: '30px 46px 26px',
            borderRadius: 38,
            background: 'rgba(8,14,26,.9)',
            border: `3px solid ${accent}`,
            boxShadow: `0 24px 70px rgba(0,0,0,.45), 0 0 48px ${accent}33`,
            transformOrigin: 'left center',
            transform: `scale(${cardScale})`,
            opacity: interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: small ? 104 : 128,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -4,
              color: '#F7FAFF',
              whiteSpace: 'nowrap',
            }}
          >
            {metric}
          </div>
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 800, letterSpacing: 5, color: accent }}>
            {metricLabel}
          </div>
        </div>
      </>
    );
  }

  if (beat.kind === 'broll' && brollUrl) {
    const footageScale = interpolate(progress, [0, 1], [1.04, 1.18]);
    const footageDrift = motion === 'pan-left'
      ? interpolate(progress, [0, 1], [22, -22])
      : motion === 'pan-right'
        ? interpolate(progress, [0, 1], [-22, 22])
        : Math.sin(progress * Math.PI * 2) * 10;
    return (
      <AbsoluteFill style={{ overflow: 'hidden', background: '#080C14' }}>
        <OffthreadVideo
          src={resolveMediaSource(brollUrl)}
          muted
          delayRenderTimeoutInMilliseconds={90000}
          delayRenderRetries={1}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'translateX(' + footageDrift + 'px) scale(' + footageScale + ')',
            filter: 'saturate(1.06) contrast(1.04)',
          }}
        />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg,rgba(4,9,17,.22),transparent 35%,rgba(4,9,17,.58))' }} />
        <div style={{
          position: 'absolute', left: 74, bottom: 72, padding: '12px 18px',
          borderLeft: '4px solid ' + accent, background: 'rgba(5,12,22,.72)',
          color: '#F7FAFF', fontSize: 20, fontWeight: 900, letterSpacing: 2,
        }}>CENA DE USO REAL</div>
      </AbsoluteFill>
    );
  }

  // hero: the main product shot, landing with a punch and then floating.
  return (
    <ProductBox
      src={main}
      scale={interpolate(land, [0, 1], [1.03, 1]) * interpolate(progress, [0, 1], [1, 1.01]) * cameraScale}
      x={cameraX}
      y={Math.sin(progress * Math.PI) * -10 + cameraY}
      rotate={cameraRotate}
    />
  );
};

/**
 * Quick diagonal light sweep that masks the cut between beats and scenes.
 * strength 1 = scene change, ~0.45 = cut inside a scene.
 */
export const BeatWipe: React.FC<{ strength?: number; frames?: number }> = ({ strength = 0.45, frames = 9 }) => {
  const frame = useCurrentFrame();
  if (frame >= frames) return null;
  const t = interpolate(frame, [0, frames], [0, 1], { easing: ease, extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: -80,
          bottom: -80,
          left: '-30%',
          width: '160%',
          transform: `translateX(${interpolate(t, [0, 1], [-100, 100])}%) skewX(-14deg)`,
          background:
            'linear-gradient(90deg, rgba(20,40,160,0) 0%, rgba(66,133,244,.55) 42%, rgba(220,236,255,.9) 50%, rgba(66,133,244,.55) 58%, rgba(20,40,160,0) 100%)',
          opacity: interpolate(frame, [0, frames], [1, 0], { extrapolateRight: 'clamp' }) * strength,
        }}
      />
    </AbsoluteFill>
  );
};
