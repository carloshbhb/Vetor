import { AbsoluteFill, useCurrentFrame, Sequence } from "remotion";
import { SplitScreen } from "./SplitScreen";
import { Showcase } from "./Showcase";
import { KineticCaption } from "./KineticCaption";

interface Segment {
  id: string;
  startFrame: number;
  endFrame: number;
  narration: string;
  onScreenText?: string;
  visual: {
    layout: string;
    left?: { type: string; imageUrl?: string; filter?: string };
    right?: { type: string; imageUrl?: string; filter?: string };
    product?: { type: string; imageUrl?: string; rotation: boolean; rotationSpeed: number };
    gallery?: string[];
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
                narration={segment.onScreenText || segment.narration}
              />
            )}

            {segment.visual.layout === "showcase" && (
              <Showcase
                product={segment.visual.product!}
                infographics={segment.visual.infographics || []}
                palette={palette}
                narration={segment.narration}
                onScreenText={segment.onScreenText}
              />
            )}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
