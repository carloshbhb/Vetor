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
      <Audio src={staticFile("audio/full.mp3")} volume={1} />

      {/* Hook Section */}
      {hookSection && (
        <Sequence
          from={hookSection.startFrame}
          durationInFrames={hookSection.endFrame - hookSection.startFrame}
        >
          <Hook section={hookSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* Problem/Solution Section */}
      {psSection && (
        <Sequence
          from={psSection.startFrame}
          durationInFrames={psSection.endFrame - psSection.startFrame}
        >
          <ProblemSolution section={psSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* CTA Section */}
      {ctaSection && (
        <Sequence
          from={ctaSection.startFrame}
          durationInFrames={ctaSection.endFrame - ctaSection.startFrame}
        >
          <CTA section={ctaSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* Film Grain + Vignette Overlay - always on top */}
      <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
    </AbsoluteFill>
  );
};
