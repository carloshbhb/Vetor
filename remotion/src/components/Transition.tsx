import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";

interface TransitionProps {
  type: "fade" | "zoom_in" | "zoom_out" | "slide_up" | "slide_left" | "wipe";
  durationFrames?: number;
  children: React.ReactNode;
}

// Enter-only transition driven by one spring clock: every entrance combines
// opacity + translate/scale (never a lone fade or lone transform).
// Exit is handled by Sequence boundaries — no hardcoded frame math here.
export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames = 15,
  children,
}) => {
  const frame = useCurrentFrame();

  void durationFrames;
  const entrance = spring({
    frame,
    fps: 30,
    config: { stiffness: 160, damping: 20, mass: 0.9 },
  });

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const opacity = interpolate(entrance, [0, 1], [0, 1], clamp);
  const scaleIn = (from: number) => interpolate(entrance, [0, 1], [from, 1], clamp);

  const getTransform = () => {
    switch (type) {
      case "zoom_in":
        return `scale(${scaleIn(1.15)})`;
      case "zoom_out":
        return `scale(${scaleIn(0.85)})`;
      case "slide_up":
        return `translateY(${interpolate(entrance, [0, 1], [80, 0], clamp)}px) scale(${scaleIn(0.97)})`;
      case "slide_left":
        return `translateX(${interpolate(entrance, [0, 1], [60, 0], clamp)}px) scale(${scaleIn(0.97)})`;
      case "wipe":
        return `translateX(${interpolate(entrance, [0, 1], [120, 0], clamp)}px) scale(${scaleIn(1.05)})`;
      case "fade":
      default:
        // Fade still carries a subtle scale so it is never a lone fade.
        return `scale(${scaleIn(1.04)})`;
    }
  };

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: getTransform(),
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
