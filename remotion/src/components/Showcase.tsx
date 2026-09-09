import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { InfographicChart } from "./InfographicChart";

interface ShowcaseProps {
  product: { type: string; device: string; rotation: boolean; rotationSpeed: number };
  infographics: Array<{ type: string; data: unknown; title?: string; animated: boolean }>;
  palette: Record<string, string>;
}

export const Showcase: React.FC<ShowcaseProps> = ({ product, infographics, palette }) => {
  const frame = useCurrentFrame();

  const floatY = interpolate(Math.sin(frame * 0.05), [-1, 1], [-10, 10]);
  const rotation = product.rotation ? frame * product.rotationSpeed : 0;

  const fadeIn = spring({ frame, fps: 30, config: { stiffness: 100, damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 40,
      }}
    >
      <div
        style={{
          width: 400,
          height: 300,
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
          borderRadius: 20,
          transform: `translateY(${floatY}px) rotate(${rotation}deg) scale(${fadeIn})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: `0 20px 60px ${palette.primary}40`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            background: palette.dark,
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            padding: 20,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF4757" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFA502" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2ED573" }} />
          </div>
          <div style={{ flex: 1, background: "#16213E", borderRadius: 8, marginTop: 8 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
        {infographics.map((info, i) => (
          <InfographicChart
            key={i}
            type={info.type}
            data={info.data as { label: string; value: number; color: string }}
            animated={info.animated}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
