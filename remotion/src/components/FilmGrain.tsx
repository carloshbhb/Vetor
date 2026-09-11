import { AbsoluteFill, useCurrentFrame, random } from "remotion";

interface FilmGrainProps {
  intensity?: number;
  vignette?: boolean;
  vignetteIntensity?: number;
}

// Tileable film-grain texture (inline SVG turbulence — no network dependency).
const GRAIN_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.55'/></svg>\")";

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.05,
  vignette = true,
  vignetteIntensity = 0.55,
}) => {
  const frame = useCurrentFrame();

  // Deterministic per-frame jitter (random() is seeded — render stays deterministic).
  const jitter = random(`grain-opacity-${frame}`);
  const offsetX = Math.floor(random(`grain-x-${frame}`) * 160);
  const offsetY = Math.floor(random(`grain-y-${frame}`) * 160);
  const opacity = intensity * (0.7 + jitter * 0.6);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Layer 5a — animated film grain (tile offset + opacity jitter every frame) */}
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_SVG,
          backgroundSize: "160px 160px",
          backgroundPosition: `${offsetX}px ${offsetY}px`,
          opacity,
        }}
      />
      {/* Layer 5b — edge vignette */}
      {vignette && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
