import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface ParticlesProps {
  count: number;
  color: string;
  speed: number;
}

export const Particles: React.FC<ParticlesProps> = ({ count, color, speed }) => {
  const frame = useCurrentFrame();

  const particles = Array.from({ length: count }, (_, i) => {
    const seed = i * 137.508;
    const x = ((seed * 7.3) % 100);
    const size = 2 + (seed % 4);
    const animDelay = (seed % 30);

    const progress = ((frame * speed * 0.5 + animDelay) % 120) / 120;
    const yOffset = interpolate(progress, [0, 1], [110, -10]);
    const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 0.6, 0.6, 0]);

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${yOffset}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity,
        }}
      />
    );
  });

  return <AbsoluteFill style={{ overflow: "hidden" }}>{particles}</AbsoluteFill>;
};
