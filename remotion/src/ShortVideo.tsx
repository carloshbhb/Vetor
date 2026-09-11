import { AbsoluteFill, Sequence, Audio, staticFile, OffthreadVideo, Img, useCurrentFrame, interpolate } from "remotion";
import { Hook } from "./components/Hook";
import { ProblemSolution } from "./components/ProblemSolution";
import { CTA } from "./components/CTA";
import { FilmGrain } from "./components/FilmGrain";
import { QRCodeAnimated } from "./components/QRCodeAnimated";
import { getImageSrc } from "./utils/images";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySection = any;

interface ShortVideoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

// ─── Video Footage Layer (Layer 2 — behind graphics, above background) ───────
// When a section includes a `videoUrl`, render via OffthreadVideo for smooth CI.
// Falls back to Ken Burns still image when no video is provided.

const VideoFootageLayer: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
  startFrame: number;
  endFrame: number;
  palette: Record<string, string>;
}> = ({ videoUrl, imageUrl, startFrame, endFrame, palette }) => {
  const frame = useCurrentFrame();
  const duration = endFrame - startFrame;

  // Ken Burns fallback for stills
  const kenBurnsScale = interpolate(frame, [0, duration], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const kenBurnsX = interpolate(frame, [0, duration], [-12, 12], {
    extrapolateRight: "clamp",
  });

  if (videoUrl) {
    // OffthreadVideo renders in a separate thread — smooth even in CI
    return (
      <AbsoluteFill>
        <OffthreadVideo
          src={videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.4) saturate(1.2)",
          }}
          volume={0}
        />
        {/* Gradient overlay for text readability */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, 
              rgba(10,10,15,0.2) 0%, 
              rgba(10,10,15,0.5) 35%, 
              rgba(10,10,15,0.85) 70%, 
              rgba(10,10,15,1) 100%)`,
          }}
        />
        {/* Brand accent glow */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${palette.primary}30 0%, transparent 55%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (imageUrl) {
    // Ken Burns still fallback
    return (
      <AbsoluteFill>
        <Img
          src={getImageSrc(imageUrl)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.35) saturate(1.3) contrast(1.1)",
            transform: `scale(${kenBurnsScale}) translateX(${kenBurnsX}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, 
              rgba(10,10,15,0.2) 0%, 
              rgba(10,10,15,0.5) 35%, 
              rgba(10,10,15,0.85) 70%, 
              rgba(10,10,15,1) 100%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${palette.primary}30 0%, transparent 55%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};

export const ShortVideo: React.FC<ShortVideoProps> = ({ data }) => {
  const { sections, meta } = data;
  const frame = useCurrentFrame();

  const hookSection = sections.find((s: AnySection) => s.type === "hook");
  const psSection = sections.find((s: AnySection) => s.type === "problem_solution");
  const ctaSection = sections.find((s: AnySection) => s.type === "cta");

  // Get affiliate URL from CTA section
  const affiliateUrl = ctaSection?.visual?.qr_code?.url || ctaSection?.visual?.buy_button?.url || "";

  // QR code entrance animation (appears after 2 seconds)
  const qrEntrance = interpolate(frame, [60, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const qrScale = interpolate(qrEntrance, [0, 1], [0.5, 1]);
  const qrOpacity = qrEntrance;
  const qrY = interpolate(qrEntrance, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: meta.palette.dark }}>
      {/* Layer 1 — Background: Hook section footage/image */}
      {hookSection && (
        <Sequence
          from={hookSection.startFrame}
          durationInFrames={hookSection.endFrame - hookSection.startFrame}
        >
          <VideoFootageLayer
            videoUrl={hookSection.visual?.videoUrl}
            imageUrl={hookSection.visual?.backgroundImage}
            startFrame={hookSection.startFrame}
            endFrame={hookSection.endFrame}
            palette={meta.palette}
          />
        </Sequence>
      )}

      {/* Layer 2 — Background: Problem/Solution section footage/image */}
      {psSection && (
        <Sequence
          from={psSection.startFrame}
          durationInFrames={psSection.endFrame - psSection.startFrame}
        >
          <VideoFootageLayer
            videoUrl={psSection.segments?.[0]?.visual?.videoUrl}
            imageUrl={psSection.segments?.[0]?.visual?.left?.imageUrl}
            startFrame={psSection.startFrame}
            endFrame={psSection.endFrame}
            palette={meta.palette}
          />
        </Sequence>
      )}

      {/* Layer 2 — Background: CTA section footage/image */}
      {ctaSection && (
        <Sequence
          from={ctaSection.startFrame}
          durationInFrames={ctaSection.endFrame - ctaSection.startFrame}
        >
          <VideoFootageLayer
            videoUrl={ctaSection.visual?.videoUrl}
            imageUrl={ctaSection.visual?.backgroundImage}
            startFrame={ctaSection.startFrame}
            endFrame={ctaSection.endFrame}
            palette={meta.palette}
          />
        </Sequence>
      )}

      {/* Layer 3 — Graphics: Hook Section */}
      {hookSection && (
        <Sequence
          from={hookSection.startFrame}
          durationInFrames={hookSection.endFrame - hookSection.startFrame}
        >
          <Hook 
            section={{
              ...hookSection,
              timedWords: meta.timedWords?.filter((tw: any) => 
                tw.startMs >= hookSection.startFrame * (1000 / 30) && 
                tw.endMs <= hookSection.endFrame * (1000 / 30)
              ),
            }} 
            palette={meta.palette} 
          />
        </Sequence>
      )}

      {/* Layer 3 — Graphics: Problem/Solution Section */}
      {psSection && (
        <Sequence
          from={psSection.startFrame}
          durationInFrames={psSection.endFrame - psSection.startFrame}
        >
          <ProblemSolution section={psSection} palette={meta.palette} />
        </Sequence>
      )}

      {/* Layer 3 — Graphics: CTA Section (without QR code, it's global now) */}
      {ctaSection && (
        <Sequence
          from={ctaSection.startFrame}
          durationInFrames={ctaSection.endFrame - ctaSection.startFrame}
        >
          <CTA section={ctaSection} palette={meta.palette} hideQR={true} />
        </Sequence>
      )}

      {/* Global QR Code — visible throughout the entire video */}
      {affiliateUrl && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            right: 40,
            opacity: qrOpacity,
            transform: `scale(${qrScale}) translateY(${qrY}px)`,
            zIndex: 100,
          }}
        >
          <QRCodeAnimated
            url={affiliateUrl}
            size={120}
            delay={0}
          />
        </div>
      )}

      {/* Full audio track */}
      <Audio src={staticFile("audio/full.mp3")} volume={1} />

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
