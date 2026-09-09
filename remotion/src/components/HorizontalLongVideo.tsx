import { AbsoluteFill, Sequence } from "remotion";
import { HorizontalHook } from "./HorizontalHook";
import { HorizontalShowcase } from "./HorizontalShowcase";
import { HorizontalCTA } from "./HorizontalCTA";
import { FilmGrain } from "./FilmGrain";
import { Transition } from "./Transition";

interface HorizontalLongVideoProps {
  data: any;
}

export const HorizontalLongVideo: React.FC<HorizontalLongVideoProps> = ({ data }) => {
  const { sections, meta } = data;

  const hookSection = sections.find((s: any) => s.type === "hook");
  const psSection = sections.find((s: any) => s.type === "problem_solution");
  const ctaSection = sections.find((s: any) => s.type === "cta");

  return (
    <AbsoluteFill style={{ backgroundColor: meta.palette.dark }}>
      {hookSection && (
        <Sequence from={hookSection.startFrame} durationInFrames={hookSection.endFrame - hookSection.startFrame}>
          <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
          <HorizontalHook section={hookSection} palette={meta.palette} />
        </Sequence>
      )}
      {psSection && (
        <Sequence from={psSection.startFrame} durationInFrames={psSection.endFrame - psSection.startFrame}>
          <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
          {psSection.segments.map((segment: any, i: number) => (
            <Transition key={segment.id} type={i === 0 ? "slide_left" : "fade"} durationFrames={15}>
              <AbsoluteFill>
                {segment.visual.layout === "split_screen" && (
                  <HorizontalShowcase
                    product={segment.visual.left ? { type: "image", imageUrl: segment.visual.left.imageUrl, rotation: false, rotationSpeed: 0 } : { type: "image", imageUrl: segment.visual.right?.imageUrl, rotation: false, rotationSpeed: 0 }}
                    infographics={segment.visual.infographics || []}
                    palette={meta.palette}
                    narration={segment.narration}
                    onScreenText={segment.onScreenText}
                  />
                )}
                {segment.visual.layout === "showcase" && (
                  <HorizontalShowcase
                    product={segment.visual.product!}
                    infographics={segment.visual.infographics || []}
                    palette={meta.palette}
                    narration={segment.narration}
                    onScreenText={segment.onScreenText}
                  />
                )}
              </AbsoluteFill>
            </Transition>
          ))}
        </Sequence>
      )}
      {ctaSection && (
        <Sequence from={ctaSection.startFrame} durationInFrames={ctaSection.endFrame - ctaSection.startFrame}>
          <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
          <HorizontalCTA section={ctaSection} palette={meta.palette} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
