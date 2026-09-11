import { useCurrentFrame, spring, interpolate } from "remotion";

interface BuyButtonProps {
  text: string;
  color: string;
  textColor: string;
  fontSize: number;
  borderRadius: number;
  stiffness: number;
  damping: number;
}

export const BuyButton: React.FC<BuyButtonProps> = ({
  text,
  color,
  textColor,
  fontSize,
  borderRadius,
  stiffness,
  damping,
}) => {
  const frame = useCurrentFrame();

  const bounceSpring = spring({
    frame,
    fps: 30,
    config: { stiffness, damping },
  });

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Entrance: one spring clock driving opacity + translateY + scale (never a lone fade/scale).
  const scale = interpolate(bounceSpring, [0, 1], [0, 1], clamp);
  const opacity = interpolate(bounceSpring, [0, 1], [0, 1], clamp);
  const rise = interpolate(bounceSpring, [0, 1], [24, 0], clamp);

  const pulse = interpolate(Math.sin(frame * 0.12), [-1, 1], [1, 1.05]);

  const glowIntensity = interpolate(Math.sin(frame * 0.1), [-1, 1], [20, 40]);

  return (
    <div
      style={{
        transform: `translateY(${rise}px) scale(${scale * pulse})`,
        opacity,
        background: color,
        padding: "24px 60px",
        borderRadius,
        boxShadow: `0 0 ${glowIntensity}px ${color}80, 0 10px 30px ${color}40`,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: textColor,
          fontFamily: "Inter, system-ui, sans-serif",
          letterSpacing: 2,
        }}
      >
        {text}
      </span>
    </div>
  );
};
