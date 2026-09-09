import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring } from "remotion";
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

  // Ken Burns on background
  const kenBurnsScale = interpolate(frame, [0, 180], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  // Product entrance
  const productSpring = spring({
    frame: frame - 5,
    fps: 30,
    config: { stiffness: 120, damping: 18 },
  });
  const productScale = interpolate(productSpring, [0, 1], [0.7, 1]);
  const productOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow pulse
  const glowPulse = interpolate(Math.sin(frame * 0.07), [-1, 1], [0.3, 0.7]);

  // Text entrance
  const textEntrance = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

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
              transform: `scale(${kenBurnsScale})`,
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
                transform: `scale(${productScale})`,
                filter: `drop-shadow(0 25px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 50px ${palette.primary}35)`,
                opacity: productOpacity,
              }}
            />
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom text area with entrance animation */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 180,
        }}
      >
        {narration && (
          <div
            style={{
              color: "white",
              fontSize: 44,
              fontWeight: 800,
              textAlign: "center",
              padding: "0 60px",
              fontFamily: "Inter, system-ui, sans-serif",
              textShadow: `0 4px 25px rgba(0,0,0,0.8), 0 0 40px ${palette.primary}30`,
              lineHeight: 1.3,
              opacity: textEntrance,
              transform: `translateY(${interpolate(textEntrance, [0, 1], [25, 0])}px)`,
            }}
          >
            {narration}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
