import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
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
      <Audio src={staticFile("audio/full.mp3")} volume={1} />
      {hookSection && (
        <Sequence from={hookSection.startFrame} durationInFrames={hookSection.endFrame - hookSection.startFrame}>
          <HorizontalHook section={hookSection} palette={meta.palette} />
        </Sequence>
      )}
      {psSection && (
        <Sequence from={psSection.startFrame} durationInFrames={psSection.endFrame - psSection.startFrame}>
          {psSection.segments.map((segment: any, i: number) => (
            <Sequence
              key={segment.id}
              from={segment.startFrame - psSection.startFrame}
              durationInFrames={segment.endFrame - segment.startFrame}
            >
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
            </Sequence>
          ))}
        </Sequence>
      )}
      {ctaSection && (
        <Sequence from={ctaSection.startFrame} durationInFrames={ctaSection.endFrame - ctaSection.startFrame}>
          <HorizontalCTA section={ctaSection} palette={meta.palette} />
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

      {/* Layer 5 — film grain + vignette, single mount always on top */}
      <FilmGrain intensity={0.03} vignette={true} vignetteIntensity={0.55} />
    </AbsoluteFill>
  );
};
