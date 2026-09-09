import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { KineticCaption } from "./KineticCaption";
import { QRCodeAnimated } from "./QRCodeAnimated";
import { UrgencyCounter } from "./UrgencyCounter";
import { BuyButton } from "./BuyButton";
import { SocialProof } from "./SocialProof";
import { getImageSrc } from "../utils/images";

interface CTAProps {
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

export const CTA: React.FC<CTAProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();
  const { visual, narration } = section;

  const hasImage = !!visual.backgroundImage;

  // Entrance animations
  const entranceProgress = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns for background
  const kenBurnsScale = interpolate(frame, [0, 180], [1.05, 1.15], {
    extrapolateRight: "clamp",
  });

  // Product entrance with spring
  const productSpring = spring({
    frame: frame - 8,
    fps: 30,
    config: { stiffness: 150, damping: 20, mass: 1.1 },
  });
  const productScale = interpolate(productSpring, [0, 1], [0.5, 1]);
  const productOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow pulse
  const glowPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.9]);

  // Elements stagger entrance
  const staggerDelay = (index: number) => interpolate(
    frame,
    [20 + index * 5, 35 + index * 5],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* Background: product image with blur + Ken Burns */}
      {hasImage ? (
        <AbsoluteFill>
          <Img
            src={getImageSrc(visual.backgroundImage)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(30px) brightness(0.2) saturate(0.5)",
              transform: `scale(${kenBurnsScale})`,
            }}
          />
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, 
                rgba(10,10,15,0.5) 0%, 
                rgba(10,10,15,0.7) 50%, 
                rgba(10,10,15,0.9) 100%)`,
            }}
          />
          {/* Accent glow */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${palette.primary}${Math.round(glowPulse * 30).toString(16).padStart(2, '0')} 0%, transparent 50%)`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <GradientBackground colors={visual.background.colors} angle={visual.background.angle} animated={false} />
      )}

      {/* Main content container */}
      <AbsoluteFill
        style={{
          opacity: entranceProgress,
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 80,
        }}
      >
        {/* Narration text with glow */}
        <div
          style={{
            marginBottom: 30,
            transform: `translateY(${interpolate(entranceProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          <KineticCaption
            text={narration}
            fontSize={visual.captions.fontSize}
            fontWeight={700}
            color={palette.text}
            highlightColor={visual.captions.highlightColor}
            wordByWord={true}
            effect="bounce"
          />
        </div>

        {/* Large product image with premium effects */}
        {hasImage && (
          <div
            style={{
              position: "relative",
              marginBottom: 25,
              opacity: staggerDelay(0),
              transform: `scale(${productScale})`,
            }}
          >
            {/* Outer glow ring */}
            <div
              style={{
                position: "absolute",
                inset: -50,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${palette.primary}25 0%, transparent 70%)`,
                filter: "blur(35px)",
                opacity: glowPulse,
              }}
            />
            {/* Inner glow */}
            <div
              style={{
                position: "absolute",
                inset: -20,
                background: `radial-gradient(circle, ${palette.primary}15 0%, transparent 60%)`,
                filter: "blur(20px)",
              }}
            />
            <Img
              src={getImageSrc(visual.backgroundImage)}
              style={{
                width: 520,
                height: 520,
                objectFit: "contain",
                filter: `drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 60px ${palette.primary}40)`,
              }}
            />
            {/* Shine effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: interpolate(frame % 150, [0, 150], [-200, 600]),
                width: 120,
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                transform: "skewX(-20deg)",
                pointerEvents: "none",
              }}
            />
          </div>
        )}

        {/* Urgency */}
        {visual.urgency.enabled && (
          <div style={{ 
            marginBottom: 25,
            opacity: staggerDelay(1),
            transform: `translateY(${interpolate(staggerDelay(1), [0, 1], [20, 0])}px)`,
          }}>
            <UrgencyCounter
              text={visual.urgency.text}
              startValue={visual.urgency.startValue}
              color={visual.urgency.color}
              fontSize={visual.urgency.fontSize}
            />
          </div>
        )}

        {/* QR Code */}
        {visual.qr_code.enabled && (
          <div style={{ 
            marginBottom: 20,
            opacity: staggerDelay(2),
            transform: `scale(${interpolate(staggerDelay(2), [0, 1], [0.8, 1])})`,
          }}>
            <QRCodeAnimated
              url={visual.qr_code.url}
              size={visual.qr_code.size}
              delay={visual.qr_code.animation.delay}
            />
          </div>
        )}

        {/* Buy Button with pulse */}
        <div style={{ 
          marginBottom: 25,
          opacity: staggerDelay(3),
          transform: `scale(${interpolate(staggerDelay(3), [0, 1], [0.7, 1])})`,
        }}>
          <BuyButton
            text={visual.buy_button.text}
            color={visual.buy_button.color}
            textColor={visual.buy_button.textColor}
            fontSize={visual.buy_button.fontSize}
            borderRadius={visual.buy_button.borderRadius}
            stiffness={visual.buy_button.animation.stiffness}
            damping={visual.buy_button.animation.damping}
          />
        </div>

        {/* Social Proof */}
        <div style={{
          opacity: staggerDelay(4),
        }}>
          <SocialProof
            stars={visual.social_proof.stars}
            reviewCount={visual.social_proof.reviewCount}
            avatarCount={visual.social_proof.avatars.count}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
