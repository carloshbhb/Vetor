import { AbsoluteFill, Img, useCurrentFrame, spring, interpolate } from "remotion";
import { InfographicChart } from "./InfographicChart";
import { getImageSrc } from "../utils/images";

interface HorizontalShowcaseProps {
  product: { type: string; imageUrl?: string; rotation: boolean; rotationSpeed: number };
  infographics: Array<{ type: string; data: unknown; title?: string; animated: boolean }>;
  palette: Record<string, string>;
  narration?: string;
  onScreenText?: string;
}

export const HorizontalShowcase: React.FC<HorizontalShowcaseProps> = ({ product, infographics, palette, narration, onScreenText }) => {
  const frame = useCurrentFrame();
  const hasImage = !!product.imageUrl;

  const kenBurnsScale = interpolate(frame, [0, 180], [1.0, 1.06], { extrapolateRight: "clamp" });
  const floatY = interpolate(Math.sin(frame * 0.04), [-1, 1], [-8, 8]);
  const productSpring = spring({ frame, fps: 30, config: { stiffness: 120, damping: 18, mass: 1.2 } });
  const productScale = interpolate(productSpring, [0, 1], [0.6, 1]);
  const productOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.8]);
  const textEntrance = interpolate(frame, [12, 28], [0, 1], { extrapolateRight: "clamp" });
  const infoEntrance = interpolate(frame, [25, 42], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {hasImage ? (
        <AbsoluteFill>
          <Img src={getImageSrc(product.imageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3) saturate(1.3) contrast(1.1)", transform: `scale(${kenBurnsScale})` }} />
          <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,10,15,0.45) 0%, rgba(10,10,15,0.0) 22%, rgba(10,10,15,0.0) 50%, rgba(10,10,15,0.85) 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 38%, ${palette.primary}${Math.round(glowPulse * 25).toString(16).padStart(2, '0')} 0%, transparent 45%)` }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, ${palette.dark}, ${palette.surface})` }} />
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 150 }}>
        {hasImage && (
          <div style={{ position: "relative", transform: `translateY(${floatY}px) scale(${productScale})`, opacity: productOpacity }}>
            <div style={{ position: "absolute", inset: -50, borderRadius: "50%", background: `radial-gradient(circle, ${palette.primary}25 0%, transparent 70%)`, filter: "blur(35px)", opacity: glowPulse }} />
            <div style={{ position: "absolute", inset: -20, background: `radial-gradient(circle, ${palette.primary}15 0%, transparent 60%)`, filter: "blur(20px)" }} />
            <Img src={getImageSrc(product.imageUrl)} style={{ width: 900, height: 900, objectFit: "contain", filter: `drop-shadow(0 35px 80px rgba(0,0,0,0.7)) drop-shadow(0 0 70px ${palette.primary}40)` }} />
            <div style={{ position: "absolute", top: 0, left: interpolate(frame % 120, [0, 120], [-200, 880]), width: 140, height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", transform: "skewX(-20deg)", pointerEvents: "none" }} />
          </div>
        )}
      </AbsoluteFill>
      {onScreenText && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 500 }}>
          <div style={{ color: "white", fontSize: 64, fontWeight: 900, textAlign: "center", fontFamily: "Inter, system-ui, sans-serif", textShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 60px ${palette.primary}40`, letterSpacing: 2, opacity: textEntrance, transform: `translateY(${interpolate(textEntrance, [0, 1], [25, 0])}px)` }}>
            {onScreenText}
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 260 }}>
        <div style={{ display: "flex", gap: 40, opacity: infoEntrance, transform: `translateY(${interpolate(infoEntrance, [0, 1], [35, 0])}px)` }}>
          {infographics.map((info, i) => (
            <div key={i} style={{ opacity: interpolate(frame, [28 + i * 4, 40 + i * 4], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), transform: `translateY(${interpolate(frame, [28 + i * 4, 40 + i * 4], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}px)` }}>
              <InfographicChart type={info.type} data={info.data as { label: string; value: number; color: string }} animated={info.animated} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
      {narration && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90 }}>
          <div style={{ color: "white", fontSize: 44, fontWeight: 700, textAlign: "center", padding: "0 60px", fontFamily: "Inter, system-ui, sans-serif", textShadow: `0 4px 25px rgba(0,0,0,0.8), 0 0 30px ${palette.primary}20`, lineHeight: 1.3, opacity: interpolate(frame, [32, 48], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(frame, [32, 48], [20, 0], { extrapolateRight: "clamp" })}px)` }}>
            {narration}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
