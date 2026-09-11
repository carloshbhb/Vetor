import { useCurrentFrame, spring, interpolate } from "remotion";

interface InfographicChartProps {
  type: string;
  data: { label: string; value: number; unit?: string; color: string };
  animated: boolean;
}

export const InfographicChart: React.FC<InfographicChartProps> = ({
  type,
  data,
  animated,
}) => {
  const frame = useCurrentFrame();

  if (type === "radial_progress") {
    const progress = animated
      ? interpolate(
          spring({ frame, fps: 30, config: { stiffness: 60, damping: 15 } }),
          [0, 1],
          [0, data.value / 100]
        )
      : data.value / 100;

    const circumference = 2 * Math.PI * 80;
    const strokeDashoffset = circumference * (1 - progress);

    const idleY = frame > 30 ? Math.sin(frame * 0.03) * 1.5 : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: `translateY(${idleY}px)` }}>
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#1A1A2E"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={data.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
            style={{ filter: `drop-shadow(0 0 8px ${data.color})` }}
          />
          <text
            x="100"
            y="95"
            textAnchor="middle"
            fill="white"
            fontSize="36"
            fontWeight="bold"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {Math.round(data.value * progress)}
            {data.unit || "%"}
          </text>
          <text
            x="100"
            y="125"
            textAnchor="middle"
            fill="#888"
            fontSize="16"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {data.label}
          </text>
        </svg>
      </div>
    );
  }

  return null;
};
