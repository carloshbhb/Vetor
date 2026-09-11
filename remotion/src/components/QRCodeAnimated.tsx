import { useCurrentFrame, spring, interpolate, staticFile } from "remotion";
import { useState, useEffect } from "react";

interface QRCodeAnimatedProps {
  url: string;
  size: number;
  delay: number;
}

export const QRCodeAnimated: React.FC<QRCodeAnimatedProps> = ({ url, size, delay }) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - delay);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code as data URL
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(url, {
        width: size,
        margin: 2,
        color: {
          dark: "#0A0A0F",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      }).then((dataUrl) => {
        setQrDataUrl(dataUrl);
      });
    });
  }, [url, size]);

  const scaleSpring = spring({
    frame: localFrame,
    fps: 30,
    config: { stiffness: 200, damping: 10 },
  });

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Entrance: one spring clock driving opacity + translateY + scale.
  const scale = interpolate(scaleSpring, [0, 1], [0, 1], clamp);
  const opacity = interpolate(
    spring({
      frame: localFrame,
      fps: 30,
      config: { damping: 18, mass: 0.8, stiffness: 120 },
    }),
    [0, 1],
    [0, 1]
  );
  const rise = interpolate(scaleSpring, [0, 1], [28, 0], clamp);
  // Idle micro-movement: gentle sine breathing so the QR never sits frozen.
  const breathe = interpolate(Math.sin(frame * 0.06), [-1, 1], [-5, 5]);

  return (
    <div
      style={{
        transform: `translateY(${rise + breathe}px) scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          background: "white",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 10px 40px rgba(108, 92, 231, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            style={{
              width: size - 32,
              height: size - 32,
            }}
          />
        ) : (
          // Loading placeholder
          <div
            style={{
              width: size - 32,
              height: size - 32,
              background: "#f0f0f0",
              borderRadius: 8,
            }}
          />
        )}
      </div>
      <div
        style={{
          color: "#888",
          fontSize: 14,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Escaneie para comprar
      </div>
    </div>
  );
};
