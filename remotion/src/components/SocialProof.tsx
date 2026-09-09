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

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: fadeIn,
      }}
    >
      <div style={{ display: "flex", paddingLeft: 10 }}>
        {Array.from({ length: avatarCount }, (_, i) => {
          const slideIn = spring({
            frame: frame - i * 3,
            fps: 30,
            config: { stiffness: 200, damping: 15 },
          });
          const x = interpolate(slideIn, [0, 1], [-20, 0]);

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
                transform: `translateX(${x}px)`,
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
        {Array.from({ length: stars }, (_, i) => (
          <span key={i} style={{ fontSize: 24, color: "#FFD700" }}>
            ★
          </span>
        ))}
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
