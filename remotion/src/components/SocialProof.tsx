import { useCurrentFrame, spring, interpolate } from "remotion";

interface SocialProofProps {
  stars: number;
  reviewCount: number;
  avatarCount: number;
}

export const SocialProof: React.FC<SocialProofProps> = ({
  stars,
  reviewCount,
  avatarCount,
}) => {
  const frame = useCurrentFrame();

  // Entrance: one spring clock driving opacity + translateY + scale (never a lone fade).
  const entrance = spring({
    frame,
    fps: 30,
    config: { stiffness: 140, damping: 19 },
  });
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const entranceOpacity = interpolate(entrance, [0, 1], [0, 1], clamp);
  const entranceY = interpolate(entrance, [0, 1], [24, 0], clamp);
  const entranceScale = interpolate(entrance, [0, 1], [0.94, 1], clamp);

  const idleY = frame > 30 ? Math.sin(frame * 0.03) * 1.2 : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: entranceOpacity,
        transform: `translateY(${entranceY + idleY}px) scale(${entranceScale})`,
      }}
    >
      <div style={{ display: "flex", paddingLeft: 10 }}>
        {Array.from({ length: avatarCount }, (_, i) => {
          const slideIn = spring({
            frame: frame - i * 4,
            fps: 30,
            config: { stiffness: 200, damping: 15 },
          });
          const x = interpolate(slideIn, [0, 1], [-20, 0], clamp);
          const avatarScale = interpolate(slideIn, [0, 1], [0.6, 1], clamp);
          const avatarOpacity = interpolate(slideIn, [0, 1], [0, 1], clamp);

          return (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `hsl(${i * 60 + 260}, 70%, 60%)`,
                border: "3px solid #0A0A0F",
                marginLeft: i > 0 ? -12 : 0,
                transform: `translateX(${x}px) scale(${avatarScale})`,
                opacity: avatarOpacity,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 16,
              }}
            >
              {["😊", "🚀", "💪", "🎯", "⭐"][i]}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: stars }, (_, i) => {
          const starSpring = spring({
            frame: frame - 10 - i * 4,
            fps: 30,
            config: { stiffness: 300, damping: 12 },
          });
          const starScale = interpolate(starSpring, [0, 1], [0, 1], clamp);
          const starOpacity = interpolate(
            frame,
            [10 + i * 4, 15 + i * 4],
            [0, 1],
            clamp
          );
          return (
            <span
              key={i}
              style={{
                fontSize: 24,
                color: "#FFD700",
                display: "inline-block",
                opacity: starOpacity,
                transform: `scale(${starScale})`,
              }}
            >
              ★
            </span>
          );
        })}
      </div>

      <div
        style={{
          color: "#888",
          fontSize: 18,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {reviewCount.toLocaleString("pt-BR")} avaliações
      </div>
    </div>
  );
};
