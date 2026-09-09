import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface TransitionProps {
  type: "fade" | "zoom_in" | "zoom_out" | "slide_up" | "slide_left" | "wipe";
  durationFrames?: number;
  children: React.ReactNode;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames = 15,
  children,
}) => {
  const frame = useCurrentFrame();

  const enterProgress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  const exitProgress = interpolate(
    frame,
    [180 - durationFrames, 180],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const progress = Math.min(enterProgress, exitProgress);

  const getTransform = () => {
    switch (type) {
      case "zoom_in":
        return `scale(${interpolate(progress, [0, 1], [1.15, 1])})`;
      case "zoom_out":
        return `scale(${interpolate(progress, [0, 1], [0.85, 1])})`;
      case "slide_up":
        return `translateY(${interpolate(progress, [0, 1], [80, 0])}px)`;
      case "slide_left":
        return `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`;
      case "wipe":
        return `scale(${interpolate(progress, [0, 1], [1.2, 1])})`;
      default:
        return "none";
    }
  };

  const getOpacity = () => {
    if (type === "fade") {
      return interpolate(progress, [0, 1], [0, 1]);
    }
    if (type === "wipe") {
      return interpolate(progress, [0, 0.3], [0, 1], {
        extrapolateRight: "clamp",
      });
    }
    return 1;
  };

  return (
    <AbsoluteFill
      style={{
        opacity: getOpacity(),
        transform: getTransform(),
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
