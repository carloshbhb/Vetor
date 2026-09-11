import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring } from "remotion";
import { KineticCaption } from "./KineticCaption";
import { getImageSrc } from "../utils/images";

interface SplitScreenProps {
  left: { type: string; imageUrl?: string; filter?: string };
  right: { type: string; imageUrl?: string; filter?: string };
  palette: Record<string, string>;
  narration?: string;
}

export const SplitScreen: React.FC<SplitScreenProps> = ({ left, right, palette, narration }) => {
  const frame = useCurrentFrame();

  const imageUrl = left.imageUrl || right.imageUrl;

  // Ken Burns on background still: slow zoom + lateral drift.
  const kenBurnsScale = interpolate(frame, [0, 180], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const kenBurnsX = interpolate(frame, [0, 180], [-10, 10], {
    extrapolateRight: "clamp",
  });

  // Product entrance: one spring clock driving opacity + translateY + scale.
  const productSpring = spring({
    frame: frame - 5,
    fps: 30,
    config: { stiffness: 120, damping: 18 },
  });
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const productScale = interpolate(productSpring, [0, 1], [0.7, 1]);
  const productRise = interpolate(productSpring, [0, 1], [50, 0], clamp);
  // Idle micro-movement: sine breathing on the hero + slow Ken Burns zoom.
  const floatY = interpolate(Math.sin(frame * 0.05), [-1, 1], [-8, 8]);
  const productZoom = interpolate(frame, [5, 185], [1, 1.05], {
    extrapolateRight: "clamp",
  });
  const productOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow pulse
  const glowPulse = interpolate(Math.sin(frame * 0.07), [-1, 1], [0.3, 0.7]);

  return (
    <AbsoluteFill>
      {/* Full-screen product image with Ken Burns */}
      {imageUrl ? (
        <AbsoluteFill>
          <Img
            src={getImageSrc(imageUrl)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${kenBurnsScale}) translateX(${kenBurnsX}px)`,
              filter: "brightness(0.4) saturate(1.2) contrast(1.05)",
            }}
          />
          {/* Cinematic gradient overlays */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, 
                rgba(10,10,15,0.3) 0%, 
                rgba(10,10,15,0.05) 25%, 
                rgba(10,10,15,0.05) 55%, 
                rgba(10,10,15,0.85) 100%)`,
            }}
          />
          {/* Accent glow */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at 50% 40%, ${palette.primary}${Math.round(glowPulse * 25).toString(16).padStart(2, '0')} 0%, transparent 50%)`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${palette.dark}, ${palette.surface})`,
          }}
        />
      )}

      {/* Large centered product image with premium effects */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {imageUrl && (
          <div style={{ position: "relative" }}>
            {/* Outer glow */}
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${palette.primary}20 0%, transparent 70%)`,
                filter: "blur(30px)",
                opacity: glowPulse,
              }}
            />
            <Img
              src={getImageSrc(imageUrl)}
              style={{
                width: 750,
                height: 750,
                objectFit: "contain",
                transform: `translateY(${floatY + productRise}px) scale(${productScale * productZoom})`,
                filter: `drop-shadow(0 25px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 50px ${palette.primary}35)`,
                opacity: productOpacity,
              }}
            />
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom caption area — frame-synced kinetic word-by-word captions */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 180,
        }}
      >
        {narration && (
          <KineticCaption
            text={narration}
            fontSize={44}
            fontWeight={800}
            color="#FFFFFF"
            highlightColor={palette.primary}
            wordByWord={true}
            effect="fade_up"
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
