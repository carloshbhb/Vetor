import { AbsoluteFill, Img, useCurrentFrame, spring, interpolate } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { KineticCaption } from "./KineticCaption";
import { Particles } from "./Particles";
import { getImageSrc } from "../utils/images";

interface HookProps {
  section: {
    narration: string;
    visual: {
      backgroundImage?: string;
      background: { colors: string[]; angle: number; animated: boolean };
      captions: { style: string; effect: string; fontSize: number; fontWeight: number; color: string; highlightColor: string };
      particles: { enabled: boolean; count: number; type: string; color: string; speed: number };
    };
  };
  palette: Record<string, string>;
}

export const Hook: React.FC<HookProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();
  const { visual, narration } = section;
  const hasImage = !!visual.backgroundImage;

  const entranceSpring = spring({ frame, fps: 30, config: { stiffness: 140, damping: 19 } });
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const entranceOpacity = interpolate(entranceSpring, [0, 1], [0, 1], clamp);
  const entranceY = interpolate(entranceSpring, [0, 1], [40, 0], clamp);
  const entranceScale = interpolate(entranceSpring, [0, 1], [0.94, 1], clamp);
  // Ken Burns on stills: slow zoom + lateral drift over the visible window.
  const kenBurnsScale = interpolate(frame, [0, 90], [1.0, 1.12], { extrapolateRight: "clamp" });
  const kenBurnsX = interpolate(frame, [0, 90], [-12, 12], { extrapolateRight: "clamp" });
  const productSpring = spring({ frame: frame - 15, fps: 30, config: { stiffness: 120, damping: 18, mass: 1.2 } });
  const productScale = interpolate(productSpring, [0, 1], [0.6, 1]);
  const productRise = interpolate(productSpring, [0, 1], [60, 0], clamp);
  const productZoom = interpolate(frame, [15, 105], [1, 1.06], { extrapolateRight: "clamp" });
  const productOpacitySpring = spring({ frame: frame - 15, fps: 30, config: { damping: 18, mass: 0.8, stiffness: 120 } });
  const productOpacity = interpolate(productOpacitySpring, [0, 1], [0, 1], clamp);
  const floatY = interpolate(Math.sin(frame * 0.05), [-1, 1], [-8, 8]);
  const glowPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.7]);

  return (
    <AbsoluteFill>
      {hasImage ? (
        <AbsoluteFill>
          <Img src={getImageSrc(visual.backgroundImage)!} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.35) saturate(1.3) contrast(1.1)", transform: `scale(${kenBurnsScale}) translateX(${kenBurnsX}px)` }} />
          <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,10,15,0.2) 0%, rgba(10,10,15,0.5) 35%, rgba(10,10,15,0.85) 70%, rgba(10,10,15,1) 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, ${palette.primary}${Math.round(glowPulse * 40).toString(16).padStart(2, '0')} 0%, transparent 55%)` }} />
          <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 15%)` }} />
        </AbsoluteFill>
      ) : (
        <GradientBackground colors={visual.background.colors} angle={visual.background.angle} animated={visual.background.animated} />
      )}
      {visual.particles.enabled && <Particles count={visual.particles.count} color={visual.particles.color} speed={visual.particles.speed} />}
      {hasImage && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 250 }}>
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${palette.primary}20 0%, transparent 70%)`, filter: "blur(40px)", opacity: glowPulse }} />
          <div style={{ transform: `translateY(${floatY + productRise}px) scale(${productScale * productZoom})`, opacity: productOpacity }}>
            <Img src={getImageSrc(visual.backgroundImage)!} style={{ width: 480, height: 480, objectFit: "contain", filter: `drop-shadow(0 30px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 80px ${palette.primary}50)` }} />
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 160, opacity: entranceOpacity, transform: `translateY(${entranceY}px) scale(${entranceScale})` }}>
        <KineticCaption text={narration} fontSize={visual.captions.fontSize} fontWeight={visual.captions.fontWeight} color={visual.captions.color} highlightColor={visual.captions.highlightColor} wordByWord={true} effect="glow" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
