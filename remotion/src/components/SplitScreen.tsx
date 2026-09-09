import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";
import { InfographicChart } from "./InfographicChart";

interface SplitScreenProps {
  left: { type: string; source: string; query: string; filter: string };
  right: { type: string; screen: string; data: { label: string; value: number; unit: string; trend: string; color: string } };
  palette: Record<string, string>;
}

export const SplitScreen: React.FC<SplitScreenProps> = ({ left, right, palette }) => {
  const frame = useCurrentFrame();

  const slideIn = spring({ frame, fps: 30, config: { stiffness: 200, damping: 20 } });
  const leftX = interpolate(slideIn, [0, 1], [-540, 0]);
  const rightX = interpolate(slideIn, [0, 1], [540, 0]);

  return (
    <AbsoluteFill style={{ flexDirection: "row" }}>
      <div
        style={{
          width: "50%",
          height: "100%",
          transform: `translateX(${leftX}px)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(135deg, ${palette.surface}, ${palette.dark})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ fontSize: 80 }}>😩</div>
          <div
            style={{
              color: "#FF4757",
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              padding: "0 20px",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Mesa bagunçada
          </div>
          {left.filter === "desaturate" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "grayscale(1)",
              }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          width: 4,
          height: "100%",
          background: `linear-gradient(180deg, ${palette.primary}, ${palette.secondary})`,
          boxShadow: `0 0 20px ${palette.primary}`,
        }}
      />

      <div
        style={{
          width: "50%",
          height: "100%",
          transform: `translateX(${rightX}px)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: palette.dark,
        }}
      >
        <InfographicChart
          type="radial_progress"
          data={right.data}
          animated={true}
        />
      </div>
    </AbsoluteFill>
  );
};
