import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { Hook } from "./components/Hook";
import { ProblemSolution } from "./components/ProblemSolution";
import { CTA } from "./components/CTA";
import { FilmGrain } from "./components/FilmGrain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySection = any;

interface ShortVideoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export const ShortVideo: React.FC<ShortVideoProps> = ({ data }) => {
  const { sections, meta } = data;

  const hookSection = sections.find((s: AnySection) => s.type === "hook");
  const psSection = sections.find((s: AnySection) => s.type === "problem_solution");
  const ctaSection = sections.find((s: AnySection) => s.type === "cta");

  return (
    <AbsoluteFill style={{ backgroundColor: meta.palette.dark }}>
      {/* Hook Section */}
      {hookSection && (
        <Sequence
          from={hookSection.startFrame}
          durationInFrames={hookSection.endFrame - hookSection.startFrame}
        >
          <Audio src={staticFile("audio/hook.mp3")} volume={1} />
          <Hook section={hookSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* Problem/Solution Section */}
      {psSection && (
        <Sequence
          from={psSection.startFrame}
          durationInFrames={psSection.endFrame - psSection.startFrame}
        >
          <Audio src={staticFile("audio/problem_solution.mp3")} volume={1} />
          <ProblemSolution section={psSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* CTA Section */}
      {ctaSection && (
        <Sequence
          from={ctaSection.startFrame}
          durationInFrames={ctaSection.endFrame - ctaSection.startFrame}
        >
          <Audio src={staticFile("audio/cta.mp3")} volume={1} />
          <CTA section={ctaSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* Layer 4 — color grading: gentle contrast S-curve + brand tint wash */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${meta.palette.primary}0D 0%, transparent 40%, rgba(0,0,20,0.12) 100%)`,
        }}
      />

      {/* Layer 5 — film grain + vignette overlay, always on top */}
      <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
    </AbsoluteFill>
  );
};
