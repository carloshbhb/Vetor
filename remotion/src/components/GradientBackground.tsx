import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

interface GradientBackgroundProps {
  colors: string[];
  angle: number;
  animated: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors,
  angle,
  animated,
}) => {
  const frame = useCurrentFrame();

  const dynamicAngle = animated
    ? angle + interpolate(frame, [0, 90], [0, 30], { extrapolateRight: "extend", easing: Easing.out(Easing.sin) })
    : angle;

  const pulse = animated
    ? interpolate(Math.sin(frame * 0.1), [-1, 1], [0.85, 1])
    : 1;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${dynamicAngle}deg, ${colors[0]}, ${colors[1] || colors[0]})`,
        opacity: pulse,
      }}
    />
  );
};
