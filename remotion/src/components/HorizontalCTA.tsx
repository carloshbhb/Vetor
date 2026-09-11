import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { KineticCaption } from "./KineticCaption";
import { QRCodeAnimated } from "./QRCodeAnimated";
import { UrgencyCounter } from "./UrgencyCounter";
import { BuyButton } from "./BuyButton";
import { SocialProof } from "./SocialProof";
import { getImageSrc } from "../utils/images";

interface HorizontalCTAProps {
  section: {
    narration: string;
    visual: {
      backgroundImage?: string;
      background: { colors: string[]; angle: number };
      qr_code: { enabled: boolean; url: string; size: number; animation: { type: string; delay: number } };
      urgency: { enabled: boolean; text: string; countdown: boolean; startValue: number; color: string; fontSize: number; animation: string };
      buy_button: { text: string; url: string; color: string; textColor: string; fontSize: number; borderRadius: number; animation: { type: string; stiffness: number; damping: number } };
      captions: { style: string; position: string; fontSize: number; highlightColor: string };
      social_proof: { stars: number; reviewCount: number; avatars: { count: number; style: string } };
    };
  };
  palette: Record<string, string>;
}

export const HorizontalCTA: React.FC<HorizontalCTAProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const { visual, narration } = section;
  const hasImage = !!visual.backgroundImage;

  // Scale-to-fit: the CTA stack is designed for full-height portrait; shrink
  // uniformly about the top on shorter viewports so every element stays in
  // safe margins. Neutral (=1) at 1920+ height.
  const fit = Math.min(1, height / 1920);

  const entranceSpring = spring({ frame, fps: 30, config: { stiffness: 140, damping: 19 } });
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const entranceOpacity = interpolate(entranceSpring, [0, 1], [0, 1], clamp);
  const entranceY = interpolate(entranceSpring, [0, 1], [30, 0], clamp);
  const entranceScale = interpolate(entranceSpring, [0, 1], [0.94, 1], clamp);
  const kenBurnsScale = interpolate(frame, [0, 180], [1.05, 1.15], { extrapolateRight: "clamp" });
  const kenBurnsX = interpolate(frame, [0, 180], [-10, 10], { extrapolateRight: "clamp" });
  const productSpring = spring({ frame: frame - 8, fps: 30, config: { stiffness: 150, damping: 20, mass: 1.1 } });
  const productScale = interpolate(productSpring, [0, 1], [0.5, 1]);
  const productRise = interpolate(productSpring, [0, 1], [60, 0], clamp);
  const floatY = interpolate(Math.sin(frame * 0.05), [-1, 1], [-7, 7]);
  const productZoom = interpolate(frame, [8, 188], [1, 1.05], { extrapolateRight: "clamp" });
  const productOpacitySpring = spring({ frame: frame - 8, fps: 30, config: { damping: 18, mass: 0.8, stiffness: 120 } });
  const productOpacity = interpolate(productOpacitySpring, [0, 1], [0, 1], clamp);
  const glowPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.9]);
  // Skill rule: 3-6 frames stagger, using 4
  const STAGGER_FRAMES = 4;
  const staggerDelay = (index: number) => interpolate(frame, [20 + index * STAGGER_FRAMES, 35 + index * STAGGER_FRAMES], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill>
      {hasImage ? (
        <AbsoluteFill>
          <Img src={getImageSrc(visual.backgroundImage)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.2) saturate(0.5)", transform: `scale(${kenBurnsScale}) translateX(${kenBurnsX}px)` }} />
          <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,10,15,0.5) 0%, rgba(10,10,15,0.7) 50%, rgba(10,10,15,0.9) 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${palette.primary}${Math.round(glowPulse * 30).toString(16).padStart(2, '0')} 0%, transparent 50%)` }} />
        </AbsoluteFill>
      ) : (
        <GradientBackground colors={visual.background.colors} angle={visual.background.angle} animated={false} />
      )}
      <AbsoluteFill style={{ transform: `scale(${fit})`, transformOrigin: "top center" }}>
      <AbsoluteFill style={{ opacity: entranceOpacity, transform: `translateY(${entranceY}px) scale(${entranceScale})`, flexDirection: "column", justifyContent: "flex-start", alignItems: "center", paddingTop: 80 }}>
        <div style={{ marginBottom: 30 }}>
          <KineticCaption text={narration} fontSize={visual.captions.fontSize} fontWeight={700} color={palette.text} highlightColor={visual.captions.highlightColor} wordByWord={true} effect="bounce" />
        </div>
        {hasImage && (
          <div style={{ position: "relative", marginBottom: 25, opacity: staggerDelay(0), transform: `translateY(${floatY + interpolate(staggerDelay(0), [0, 1], [40, 0])}px) scale(${productScale * productZoom})` }}>
            <div style={{ position: "absolute", inset: -50, borderRadius: "50%", background: `radial-gradient(circle, ${palette.primary}25 0%, transparent 70%)`, filter: "blur(35px)", opacity: glowPulse }} />
            <div style={{ position: "absolute", inset: -20, background: `radial-gradient(circle, ${palette.primary}15 0%, transparent 60%)`, filter: "blur(20px)" }} />
            <Img src={getImageSrc(visual.backgroundImage)} style={{ width: 600, height: 600, objectFit: "contain", filter: `drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 60px ${palette.primary}40)` }} />
            <div style={{ position: "absolute", top: 0, left: interpolate(frame % 150, [0, 150], [-200, 600]), width: 120, height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", transform: "skewX(-20deg)", pointerEvents: "none" }} />
          </div>
        )}
        {visual.urgency.enabled && (
          <div style={{ marginBottom: 25, opacity: staggerDelay(1), transform: `translateY(${interpolate(staggerDelay(1), [0, 1], [20, 0])}px) scale(${interpolate(staggerDelay(1), [0, 1], [0.9, 1])})` }}>
            <UrgencyCounter text={visual.urgency.text} startValue={visual.urgency.startValue} color={visual.urgency.color} fontSize={visual.urgency.fontSize} />
          </div>
        )}
        {visual.qr_code.enabled && (
          <div style={{ marginBottom: 20, opacity: staggerDelay(2), transform: `translateY(${interpolate(staggerDelay(2), [0, 1], [20, 0])}px) scale(${interpolate(staggerDelay(2), [0, 1], [0.8, 1])})` }}>
            <QRCodeAnimated url={visual.qr_code.url} size={visual.qr_code.size} delay={visual.qr_code.animation.delay} />
          </div>
        )}
        <div style={{ marginBottom: 25, opacity: staggerDelay(3), transform: `translateY(${interpolate(staggerDelay(3), [0, 1], [20, 0])}px) scale(${interpolate(staggerDelay(3), [0, 1], [0.7, 1])})` }}>
          <BuyButton text={visual.buy_button.text} color={visual.buy_button.color} textColor={visual.buy_button.textColor} fontSize={visual.buy_button.fontSize} borderRadius={visual.buy_button.borderRadius} stiffness={visual.buy_button.animation.stiffness} damping={visual.buy_button.animation.damping} />
        </div>
        <div style={{ opacity: staggerDelay(4), transform: `translateY(${interpolate(staggerDelay(4), [0, 1], [16, 0])}px) scale(${interpolate(staggerDelay(4), [0, 1], [0.92, 1])})` }}>
          <SocialProof stars={visual.social_proof.stars} reviewCount={visual.social_proof.reviewCount} avatarCount={visual.social_proof.avatars.count} />
        </div>
      </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
