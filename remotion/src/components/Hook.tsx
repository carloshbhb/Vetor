import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { KineticCaption } from "./KineticCaption";
import { Particles } from "./Particles";

interface HookProps {
  section: {
    narration: string;
    visual: {
      background: { colors: string[]; angle: number; animated: boolean };
      captions: { style: string; effect: string; fontSize: number; fontWeight: number; color: string; highlightColor: string };
      particles: { enabled: boolean; count: number; type: string; color: string; speed: number };
    };
  };
  palette: Record<string, string>;
}

export const Hook: React.FC<HookProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();
  const { visual, narration } = section;

  const scaleSpring = spring({ frame, fps: 30, config: { stiffness: 300, damping: 15 } });
  const scale = interpolate(scaleSpring, [0, 1], [1.5, 1]);
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBackground
        colors={visual.background.colors}
        angle={visual.background.angle}
        animated={visual.background.animated}
      />

      {visual.particles.enabled && (
        <Particles
          count={visual.particles.count}
          color={visual.particles.color}
          speed={visual.particles.speed}
        />
      )}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <KineticCaption
          text={narration}
          fontSize={visual.captions.fontSize}
          fontWeight={visual.captions.fontWeight}
          color={visual.captions.color}
          highlightColor={visual.captions.highlightColor}
          wordByWord={true}
          effect="scale_spring"
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
