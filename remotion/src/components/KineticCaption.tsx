import { useCurrentFrame, spring, interpolate } from "remotion";

interface KineticCaptionProps {
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  wordByWord: boolean;
  effect: "scale_spring" | "fade_up" | "glow" | "bounce";
  wordsPerSecond?: number;
}

export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  fontSize,
  fontWeight,
  color,
  highlightColor,
  wordByWord,
  effect,
  wordsPerSecond = 4,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const framesPerWord = Math.round(30 / wordsPerSecond);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px 12px",
        padding: "0 60px",
        maxWidth: "100%",
      }}
    >
      {words.map((word, i) => {
        const delay = wordByWord ? i * framesPerWord : 0;
        const localFrame = Math.max(0, frame - delay);

        const scaleSpring = spring({
          frame: localFrame,
          fps: 30,
          config: { stiffness: 500, damping: 15 },
        });

        const getEffect = () => {
          switch (effect) {
            case "glow":
              return {
                scale: interpolate(scaleSpring, [0, 1], [0.6, 1]),
                translateY: 0,
                glow: interpolate(localFrame, [0, 10], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              };
            case "bounce":
              return {
                scale: interpolate(
                  spring({
                    frame: localFrame,
                    fps: 30,
                    config: { stiffness: 600, damping: 8, mass: 0.8 },
                  }),
                  [0, 1],
                  [0.2, 1]
                ),
                translateY: interpolate(
                  spring({
                    frame: localFrame,
                    fps: 30,
                    config: { stiffness: 400, damping: 10 },
                  }),
                  [0, 1],
                  [40, 0]
                ),
                glow: 0,
              };
            case "fade_up":
              return {
                scale: interpolate(scaleSpring, [0, 1], [0.9, 1]),
                translateY: interpolate(localFrame, [0, 10], [35, 0], {
                  extrapolateRight: "clamp",
                }),
                glow: 0,
              };
            default:
              return {
                scale: interpolate(scaleSpring, [0, 1], [0.3, 1]),
                translateY: 0,
                glow: 0,
              };
          }
        };

        const { scale, translateY, glow } = getEffect();
        const opacity = interpolate(localFrame, [0, 5], [0, 1], {
          extrapolateRight: "clamp",
        });

        const isActive =
          frame >= delay && frame < delay + framesPerWord * 2;
        const isHighlight = isActive && wordByWord;

        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              fontSize,
              fontWeight,
              color: isHighlight ? highlightColor : color,
              transform: `scale(${scale}) translateY(${translateY}px)`,
              opacity,
              textShadow: isHighlight
                ? `0 0 30px ${highlightColor}80, 0 0 60px ${highlightColor}40, 0 4px 20px rgba(0,0,0,0.5)`
                : "0 4px 20px rgba(0,0,0,0.5)",
              fontFamily: "Inter, system-ui, sans-serif",
              lineHeight: 1.2,
              transition: "color 0.1s ease",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
