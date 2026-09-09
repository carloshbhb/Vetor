import { AbsoluteFill } from "remotion";

interface FilmGrainProps {
  intensity?: number;
  vignette?: boolean;
  vignetteIntensity?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  vignette = true,
  vignetteIntensity = 0.55,
}) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
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
