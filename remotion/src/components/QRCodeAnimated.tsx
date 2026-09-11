import { useCurrentFrame, spring, interpolate, staticFile, Img } from "remotion";

interface QRCodeAnimatedProps {
  url: string;
  size: number;
  delay: number;
}

export const QRCodeAnimated: React.FC<QRCodeAnimatedProps> = ({ url, size, delay }) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - delay);

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Simple fade-in + scale entrance
  const entrance = spring({
    frame: localFrame,
    fps: 30,
    config: { stiffness: 150, damping: 15 },
  });
  const scale = interpolate(entrance, [0, 1], [0.7, 1], clamp);
  const opacity = interpolate(entrance, [0, 1], [0, 1], clamp);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: size + 24,
          height: size + 24,
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile("qr.png")}
          style={{
            width: size,
            height: size,
          }}
        />
      </div>
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 13,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 600,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          letterSpacing: 0.5,
        }}
      >
        Escaneie para comprar
      </div>
    </div>
  );
};
