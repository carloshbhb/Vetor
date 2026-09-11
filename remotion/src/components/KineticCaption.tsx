import { useCurrentFrame, spring, interpolate } from "remotion";

// ─── Timing Source ───────────────────────────────────────────────────────────
// When `timedWords` is provided, use frame-accurate timing from SRT/JSON.
// Otherwise fall back to even distribution (wordsPerSecond heuristic).

export interface TimedWord {
  text: string;
  startMs: number;
  endMs: number;
}

interface KineticCaptionProps {
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  wordByWord: boolean;
  effect: "scale_spring" | "fade_up" | "glow" | "bounce";
  /** Frame-accurate word timings from SRT/JSON (optional — enables @remotion/captions mode) */
  timedWords?: TimedWord[];
  /** Fallback: words per second for even distribution */
  wordsPerSecond?: number;
  /** Override font family */
  fontFamily?: string;
}

// ─── Standard stagger delay (skill rule: 3-6 frames) ────────────────────────
const STAGGER_FRAMES = 4;

export const KineticCaption: React.FC<KineticCaptionProps> = ({
  text,
  fontSize,
  fontWeight,
  color,
  highlightColor,
  wordByWord,
  effect,
  timedWords,
  wordsPerSecond = 4,
  fontFamily = "Inter, system-ui, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const words = text.split(" ");

  // ─── Build word list ─────────────────────────────────────────────────────
  const captionWords: TimedWord[] = timedWords
    ? timedWords.map((tw) => ({
        text: tw.text,
        startMs: tw.startMs,
        endMs: tw.endMs,
      }))
    : words.map((w, i) => {
        const framesPerWord = Math.round(fps / wordsPerSecond);
        const startMs = (i * framesPerWord * 1000) / fps;
        const endMs = ((i + 1) * framesPerWord * 1000) / fps;
        return { text: w, startMs, endMs };
      });

  // Current word index based on frame
  const currentTimeMs = (frame * 1000) / fps;
  const activeIndex = captionWords.findIndex(
    (w) => currentTimeMs >= w.startMs && currentTimeMs < w.endMs
  );

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
      {captionWords.map((word, i) => {
        const wordStartFrame = Math.round((word.startMs * fps) / 1000);
        const localFrame = Math.max(0, frame - wordStartFrame);
        const isActive = i === activeIndex;

        const scaleSpring = spring({
          frame: localFrame,
          fps,
          config: { stiffness: 500, damping: 15 },
        });

        const getEffect = () => {
          switch (effect) {
            case "glow":
              return {
                scale: interpolate(scaleSpring, [0, 1], [0.6, 1]),
                translateY: interpolate(scaleSpring, [0, 1], [14, 0]),
                glow: interpolate(localFrame, [0, 10], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              };
            case "bounce":
              return {
                scale: interpolate(
                  spring({
                    frame: localFrame,
                    fps,
                    config: { stiffness: 600, damping: 8, mass: 0.8 },
                  }),
                  [0, 1],
                  [0.2, 1]
                ),
                translateY: interpolate(
                  spring({
                    frame: localFrame,
                    fps,
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
                translateY: interpolate(
                  spring({
                    frame: localFrame,
                    fps,
                    config: { damping: 18, mass: 0.8, stiffness: 120 },
                  }),
                  [0, 1],
                  [35, 0]
                ),
                glow: 0,
              };
            default:
              return {
                scale: interpolate(scaleSpring, [0, 1], [0.3, 1]),
                translateY: interpolate(scaleSpring, [0, 1], [14, 0]),
                glow: 0,
              };
          }
        };

        const { scale, translateY, glow } = getEffect();
        const opacity = interpolate(
          spring({
            frame: localFrame,
            fps,
            config: { damping: 18, mass: 0.8, stiffness: 120 },
          }),
          [0, 1],
          [0, 1]
        );

        const isHighlight = isActive && wordByWord;

        return (
          <span
            key={`${word.text}-${i}`}
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
              fontFamily,
              lineHeight: 1.2,
              transition: "color 0.1s ease",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
