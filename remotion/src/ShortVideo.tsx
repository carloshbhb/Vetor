import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { Hook } from "./components/Hook";
import { ProblemSolution } from "./components/ProblemSolution";
import { CTA } from "./components/CTA";

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
      {hookSection && (
        <Sequence
          from={hookSection.startFrame}
          durationInFrames={hookSection.endFrame - hookSection.startFrame}
        >
          <Audio src={staticFile("audio/hook.mp3")} />
          <Hook section={hookSection} palette={meta.palette} />
        </Sequence>
      )}

      {psSection && (
        <Sequence
          from={psSection.startFrame}
          durationInFrames={psSection.endFrame - psSection.startFrame}
        >
          <Audio src={staticFile("audio/problem_solution.mp3")} />
          <ProblemSolution section={psSection} palette={meta.palette} />
        </Sequence>
      )}

      {ctaSection && (
        <Sequence
          from={ctaSection.startFrame}
          durationInFrames={ctaSection.endFrame - ctaSection.startFrame}
        >
          <Audio src={staticFile("audio/cta.mp3")} />
          <CTA section={ctaSection} palette={meta.palette} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
