import { AbsoluteFill, useCurrentFrame, Sequence, interpolate } from "remotion";
import { SplitScreen } from "./SplitScreen";
import { Showcase } from "./Showcase";
import { KineticCaption } from "./KineticCaption";

interface Segment {
  id: string;
  startFrame: number;
  endFrame: number;
  narration: string;
  visual: {
    layout: string;
    left?: { type: string; source: string; query: string; filter: string };
    right?: { type: string; screen: string; data: { label: string; value: number; unit: string; trend: string; color: string } };
    product?: { type: string; device: string; rotation: boolean; rotationSpeed: number };
    infographics?: Array<{ type: string; data: unknown; title?: string; animated: boolean; renderEngine?: string }>;
    captions?: { style: string; position: string; fontSize: number; wordByWord?: boolean };
    transitions?: { type: string; duration?: number; interval?: number };
  };
}

interface ProblemSolutionProps {
  section: { segments: Segment[] };
  palette: Record<string, string>;
}

export const ProblemSolution: React.FC<ProblemSolutionProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {section.segments.map((segment) => (
        <Sequence
          key={segment.id}
          from={segment.startFrame - section.segments[0].startFrame}
          durationInFrames={segment.endFrame - segment.startFrame}
        >
          <AbsoluteFill>
            {segment.visual.layout === "split_screen" && (
              <SplitScreen
                left={segment.visual.left!}
                right={segment.visual.right!}
                palette={palette}
              />
            )}

            {segment.visual.layout === "showcase" && (
              <Showcase
                product={segment.visual.product!}
                infographics={segment.visual.infographics || []}
                palette={palette}
              />
            )}

            {segment.visual.captions && (
              <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 120 }}>
                <KineticCaption
                  text={segment.narration}
                  fontSize={segment.visual.captions.fontSize}
                  fontWeight={700}
                  color={palette.text}
                  highlightColor={palette.accent}
                  wordByWord={segment.visual.captions.wordByWord || false}
                  effect="fade_up"
                />
              </AbsoluteFill>
            )}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
