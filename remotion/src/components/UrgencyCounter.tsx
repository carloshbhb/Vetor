import { useCurrentFrame, spring, interpolate } from "remotion";

interface UrgencyCounterProps {
  text: string;
  startValue: number;
  color: string;
  fontSize: number;
}

export const UrgencyCounter: React.FC<UrgencyCounterProps> = ({
  text,
  startValue,
  color,
  fontSize,
}) => {
  const frame = useCurrentFrame();

  // Entrance: one spring clock driving opacity + translateY + scale.
  const entrance = spring({
    frame,
    fps: 30,
    config: { stiffness: 140, damping: 19 },
  });
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const entranceOpacity = interpolate(entrance, [0, 1], [0, 1], clamp);
  const entranceY = interpolate(entrance, [0, 1], [28, 0], clamp);
  const entranceScale = interpolate(entrance, [0, 1], [0.92, 1], clamp);

  const pulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [1, 1.08]);

  const countdown = Math.max(1, startValue - Math.floor(frame / 20));

  const numberSpring = spring({
    frame: frame % 20,
    fps: 30,
    config: { stiffness: 300, damping: 15 },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: entranceOpacity,
        transform: `translateY(${entranceY}px) scale(${entranceScale * pulse})`,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          color,
          fontFamily: "Inter, system-ui, sans-serif",
          textShadow: `0 0 30px ${color}60`,
        }}
      >
        {text}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            transform: `scale(${numberSpring})`,
            display: "inline-block",
          }}
        >
          {countdown}
        </span>
        <span
          style={{
            fontSize: 28,
            color: "#888",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          restantes
        </span>
      </div>
    </div>
  );
};
