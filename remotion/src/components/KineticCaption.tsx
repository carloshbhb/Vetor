import { useCurrentFrame, spring, interpolate } from "remotion";

interface KineticCaptionProps {
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  wordByWord: boolean;
  effect: "scale_spring" | "fade_up";
}

export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  fontSize,
  fontWeight,
  color,
  highlightColor,
  wordByWord,
  effect,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

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
        const delay = wordByWord ? i * 3 : 0;
        const localFrame = Math.max(0, frame - delay);

        const scaleSpring = spring({
          frame: localFrame,
          fps: 30,
          config: { stiffness: 400, damping: 12 },
        });

        const translateY = effect === "fade_up"
          ? interpolate(localFrame, [0, 8], [30, 0], { extrapolateRight: "clamp" })
          : 0;

        const scale = effect === "scale_spring"
          ? interpolate(scaleSpring, [0, 1], [0.3, 1])
          : interpolate(scaleSpring, [0, 1], [0.8, 1]);

        const opacity = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });

        const isHighlight = i === Math.floor(words.length / 2);

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
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
              fontFamily: "Inter, system-ui, sans-serif",
              lineHeight: 1.2,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
