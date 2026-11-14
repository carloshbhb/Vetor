import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { EditorialReviewProps, EditorialScene } from "./EditorialReview";
import { KineticCaption } from "../components/KineticCaption";
import { resolveMediaSource } from "../utils/media-source";
import {
  createSceneVisualPlan,
  extractPrimaryMetric,
  type SceneVisualPlan,
} from "../utils/visual-storyboard";
import { landscapeCameraAt } from "../utils/landscape-safe-zone";
import { fitHeadlineSize } from "../utils/scene-headline";

const C = {
  bg: "#080C14",
  panel: "#0F1623",
  blue: "#4285F4",
  deepBlue: "#1428A0",
  cyan: "#70C4FF",
  amber: "#FFB85C",
  text: "#F7FAFF",
  muted: "#AEB8C8",
  red: "#FF6B6B",
  green: "#52D6A2",
};

type StickmanPose = "present" | "point" | "think" | "warning" | "celebrate";

const poseForScene = (visual: SceneVisualPlan, index: number): StickmanPose => {
  if (visual.mode === "tradeoff") return "warning";
  if (visual.mode === "specification" || visual.mode === "detail") return "point";
  if (visual.mode === "price-check") return "think";
  if (visual.mode === "comparison") return index % 2 ? "think" : "point";
  if (visual.mode === "lifestyle") return "celebrate";
  return index === 0 ? "present" : index % 2 ? "point" : "present";
};

const Stickman: React.FC<{
  pose: StickmanPose;
  accent?: string;
  scale?: number;
}> = ({ pose, accent = C.blue, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bob = Math.sin((frame / fps) * Math.PI * 2 * 1.05) * 5;
  const blink = Math.floor(frame / 57) % 5 === 0 && frame % 57 < 4;
  const wave = Math.sin((frame / fps) * Math.PI * 3.3);
  const leftHand = pose === "celebrate" ? -78 + wave * 10
    : pose === "warning" ? -58
    : pose === "think" ? -20
    : pose === "point" ? -32 + wave * 4
    : -54 + wave * 5;
  const rightHand = pose === "celebrate" ? 78 - wave * 10
    : pose === "warning" ? 58
    : pose === "think" ? -72
    : pose === "point" ? -76 + wave * 3
    : 54 + wave * 5;
  const leftForearm = pose === "celebrate" ? -28 : pose === "warning" ? 14 : pose === "think" ? -25 : -12;
  const rightForearm = pose === "think" ? -15 : pose === "warning" ? -14 : pose === "celebrate" ? 22 : -8;
  const legSwing = Math.sin((frame / fps) * Math.PI * 2 * 1.05) * 5;
  const handY = pose === "celebrate" ? -8 : pose === "warning" ? 10 : pose === "think" ? -12 : 0;
  const line = "#111B33";

  return (
    <div style={{ width: 310 * scale, height: 470 * scale, transform: "translateY(" + bob + "px)" }}>
      <svg viewBox="0 0 300 440" width="100%" height="100%" aria-label="Vetor Stickman">
        <g stroke={line} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M150 116 L150 258" />
          <path d={"M150 150 L" + (150 + Math.sin(leftHand * Math.PI / 180) * 80) + " " + (190 + handY)} />
          <path d={"M150 150 L" + (150 + Math.sin(rightHand * Math.PI / 180) * 80) + " " + (190 + handY)} />
          <path d={"M150 150 L" + (150 + Math.sin(leftHand * Math.PI / 180) * 80 + Math.sin(leftForearm * Math.PI / 180) * 58) + " " + (190 + handY + Math.cos(leftForearm * Math.PI / 180) * 58)} />
          <path d={"M150 150 L" + (150 + Math.sin(rightHand * Math.PI / 180) * 80 + Math.sin(rightForearm * Math.PI / 180) * 58) + " " + (190 + handY + Math.cos(rightForearm * Math.PI / 180) * 58)} />
          <path d={"M150 258 L" + (112 + legSwing) + " 345 L" + (98 + legSwing * 1.2) + " 402"} />
          <path d={"M150 258 L" + (188 - legSwing) + " 345 L" + (202 - legSwing * 1.2) + " 402"} />
        </g>
        <g fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round">
          <path d="M150 126 L150 220" />
          <path d="M150 126 L150 160" />
        </g>
        <circle cx="150" cy="69" r="54" fill="#FFFFFF" stroke={line} strokeWidth="12" />
        <g fill={line}>
          {blink ? (
            <>
              <path d="M126 67 Q135 72 144 67" fill="none" stroke={line} strokeWidth="6" strokeLinecap="round" />
              <path d="M158 67 Q167 72 176 67" fill="none" stroke={line} strokeWidth="6" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="135" cy="66" r="5.5" />
              <circle cx="166" cy="66" r="5.5" />
            </>
          )}
        </g>
        <path d={pose === "warning" ? "M132 91 Q150 80 169 91" : "M130 88 Q150 108 171 88"} fill="none" stroke={line} strokeWidth="6" strokeLinecap="round" />
        <path d="M118 130 Q150 143 182 130" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <rect x="130" y="167" width="40" height="25" rx="7" fill={accent} stroke={line} strokeWidth="4" />
        <path d="M140 180 H160" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <g fill={line}>
          <circle cx="98" cy="404" r="7" />
          <circle cx="202" cy="404" r="7" />
        </g>
      </svg>
    </div>
  );
};

const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      overflow: "hidden",
      color: C.text,
      fontFamily: "Inter, DM Sans, Arial, sans-serif",
      background: "radial-gradient(ellipse at 62% 40%, #1C3152 0%, #0F1623 51%, #080C14 100%)",
    }}
  >
    <AbsoluteFill style={{ background: "radial-gradient(circle at 80% 10%, rgba(66,133,244,.24), transparent 28%), radial-gradient(circle at 8% 88%, rgba(20,40,160,.24), transparent 33%)" }} />
    <AbsoluteFill>{children}</AbsoluteFill>
  </AbsoluteFill>
);

const ProductCard: React.FC<{ image: string; frame: number; size?: number }> = ({ image, frame, size = 1 }) => {
  const scale = interpolate(frame, [0, 20, 100], [0.9, 1.02, 1.08], { extrapolateRight: "clamp" });
  const float = Math.sin(frame / 19) * 8;
  return (
    <div
      style={{
        position: "absolute",
        right: 345,
        top: 218,
        width: 560,
        height: 570,
        borderRadius: 42,
        border: "2px solid rgba(112,196,255,.28)",
        background: "linear-gradient(145deg,rgba(255,255,255,.12),rgba(15,22,35,.82))",
        boxShadow: "0 32px 90px rgba(0,0,0,.42)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 44%,rgba(66,133,244,.2),transparent 60%)" }} />
      <Img
        src={resolveMediaSource(image)}
        style={{
          position: "absolute",
          inset: 32,
          width: "calc(100% - 64px)",
          height: "calc(100% - 64px)",
          objectFit: "contain",
          transform: "translateY(" + float + "px) scale(" + scale * size + ")",
          filter: "drop-shadow(0 25px 30px rgba(0,0,0,.45))",
        }}
      />
    </div>
  );
};

const SpeechBubble: React.FC<{
  eyebrow: string;
  title: string;
  body: string;
  warning?: boolean;
  metric?: string | null;
}> = ({ eyebrow, title, body, warning, metric }) => {
  const frame = useCurrentFrame();
  const lift = interpolate(frame, [0, 14], [25, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleSize = fitHeadlineSize(title, { width: 630, maxHeight: 150, maxSize: 58, minSize: 38 });
  return (
    <div
      style={{
        position: "absolute",
        left: 470,
        top: 245,
        width: 650,
        minHeight: 410,
        padding: "35px 42px",
        borderRadius: 34,
        background: "rgba(15,22,35,.94)",
        border: "2px solid " + (warning ? "rgba(255,184,92,.62)" : "rgba(112,196,255,.45)"),
        boxShadow: "0 25px 70px rgba(0,0,0,.42)",
        opacity,
        transform: "translateY(" + lift + "px)",
      }}
    >
      <div style={{ color: warning ? C.amber : C.cyan, fontSize: 20, fontWeight: 900, letterSpacing: 3.5 }}>
        {eyebrow}
      </div>
      <div style={{ marginTop: 18, fontSize: titleSize, lineHeight: 1.03, fontWeight: 900, letterSpacing: -2 }}>
        {title}
      </div>
      <div style={{ marginTop: 24, maxWidth: 585, color: C.muted, fontSize: 28, fontWeight: 620, lineHeight: 1.28 }}>
        {body}
      </div>
      {metric ? (
        <div style={{ marginTop: 28, display: "inline-flex", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 16, background: "rgba(66,133,244,.18)", border: "1px solid rgba(112,196,255,.45)" }}>
          <span style={{ color: C.text, fontSize: 42, fontWeight: 950, letterSpacing: -1 }}>{metric}</span>
          <span style={{ color: C.cyan, fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>DADO DO PRODUTO</span>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 42, bottom: -22, width: 38, height: 38, background: "rgba(15,22,35,.98)", borderLeft: "2px solid rgba(112,196,255,.45)", borderBottom: "2px solid rgba(112,196,255,.45)", transform: "rotate(-45deg)" }} />
    </div>
  );
};

const Header: React.FC<{ title: string; category: string; current: number; total: number }> = ({ title, category, current, total }) => (
  <>
    <div style={{ position: "absolute", left: 130, right: 390, top: 150, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ color: C.cyan, fontSize: 18, fontWeight: 900, letterSpacing: 4 }}>VETOR LAB • STICKMAN REVIEW</div>
        <div style={{ marginTop: 9, color: C.text, fontSize: 26, fontWeight: 850 }}>{title}</div>
      </div>
      <div style={{ padding: "10px 16px", borderRadius: 99, background: "rgba(20,40,160,.42)", color: C.text, border: "1px solid rgba(112,196,255,.35)", fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>
        {category.toUpperCase()} · {String(current).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </div>
    </div>
  </>
);

const StickmanScene: React.FC<{
  scene: EditorialScene;
  index: number;
  count: number;
  title: string;
  category: string;
  image: string;
  visual: SceneVisualPlan;
}> = ({ scene, index, count, title, category, image, visual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.min(1, Math.max(0, frame / duration));
  const metric = visual.mode === "specification" ? extractPrimaryMetric(scene.text) : null;
  const warning = visual.mode === "tradeoff";
  const pose = poseForScene(visual, index);
  const motion = Math.sin((frame / fps) * Math.PI * 2 * 0.7) * 7;
  const titleText = String(scene.visualCue || scene.text.split(/[.!?]/)[0] || "Análise do produto").trim();
  const bodyText = scene.text.length > 170 ? scene.text.slice(0, 167).trimEnd() + "…" : scene.text;
  const eyebrow =
    visual.mode === "tradeoff" ? "PONTO DE ATENÇÃO" :
    visual.mode === "specification" ? "FICHA TÉCNICA" :
    visual.mode === "price-check" ? "DECISÃO DE COMPRA" :
    visual.mode === "lifestyle" ? "NA ROTINA" :
    visual.mode === "comparison" ? "COMPARAÇÃO" :
    "OLHO NO DETALHE";

  return (
    <AbsoluteFill>
      <Header title={title} category={category} current={index + 1} total={count} />
      <div style={{ position: "absolute", left: 155, top: 295, transform: "translateY(" + motion + "px)" }}>
        <Stickman pose={pose} />
        <div style={{ marginTop: -14, width: 290, textAlign: "center", color: C.muted, fontSize: 18, fontWeight: 900, letterSpacing: 3 }}>
          VETOR STICKMAN
        </div>
      </div>
      <SpeechBubble eyebrow={eyebrow} title={titleText} body={bodyText} warning={warning} metric={metric} />
      <ProductCard image={image} frame={frame} />
      <div style={{ position: "absolute", left: 135, right: 390, bottom: 254, height: 4, borderRadius: 4, background: "rgba(255,255,255,.12)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: progress * 100 + "%", background: "linear-gradient(90deg,#1428A0,#4285F4,#70C4FF)" }} />
      </div>
      {warning ? (
        <div style={{ position: "absolute", right: 390, top: 180, padding: "10px 16px", borderRadius: 10, color: C.amber, border: "1px solid rgba(255,184,92,.55)", background: "rgba(255,184,92,.1)", fontWeight: 950, letterSpacing: 2 }}>
          ATENÇÃO
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Opening: React.FC<{
  title: string;
  category: string;
  hook: string;
  image: string;
  score: number;
}> = ({ title, category, hook, image, score }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const size = fitHeadlineSize(hook, { width: 720, maxHeight: 240, maxSize: 78, minSize: 50 });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 135, color: C.cyan, fontSize: 22, fontWeight: 900, letterSpacing: 5 }}>
        VETOR • REVIEW ANIMADO
      </div>
      <div style={{ position: "absolute", left: 130, top: 200, width: 720, fontSize: size, lineHeight: 1.02, fontWeight: 950, letterSpacing: -3, transform: "translateY(" + (1 - enter) * 35 + "px)", opacity: enter }}>
        {hook}
      </div>
      <div style={{ position: "absolute", left: 130, top: 475, color: C.muted, fontSize: 31, fontWeight: 800 }}>
        {title}
      </div>
      <div style={{ position: "absolute", left: 130, top: 540, padding: "13px 20px", borderRadius: 14, background: "rgba(82,214,162,.15)", border: "1px solid rgba(82,214,162,.55)", color: C.green, fontSize: 22, fontWeight: 950 }}>
        NOTA VETOR {score.toFixed(1)}/10
      </div>
      <div style={{ position: "absolute", left: 120, top: 600, transform: "scale(" + interpolate(enter, [0, 1], [.8, 1]) + ")" }}>
        <Stickman pose="present" scale={0.92} />
      </div>
      <ProductCard image={image} frame={frame} size={1.03} />
      <div style={{ position: "absolute", left: 130, bottom: 190, color: C.cyan, fontSize: 19, fontWeight: 900, letterSpacing: 3 }}>
        {category.toUpperCase()} • REVIEW COMPLETO NO VETOR.BLOG
      </div>
    </AbsoluteFill>
  );
};

const Closing: React.FC<{
  title: string;
  score: number;
  callToAction: string;
  image: string;
}> = ({ title, score, callToAction, image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 110 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 185, width: 660, opacity: enter }}>
        <div style={{ color: C.cyan, fontSize: 23, fontWeight: 900, letterSpacing: 4 }}>VEREDITO VETOR</div>
        <div style={{ marginTop: 25, fontSize: 78, lineHeight: 1, fontWeight: 950, letterSpacing: -4 }}>{score.toFixed(1)}/10</div>
        <div style={{ marginTop: 22, maxWidth: 700, color: C.text, fontSize: 44, lineHeight: 1.08, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 32, color: C.muted, fontSize: 29, lineHeight: 1.25 }}>{callToAction}</div>
        <div style={{ marginTop: 28, display: "inline-block", padding: "16px 25px", borderRadius: 16, color: "#FFFFFF", background: C.blue, fontSize: 23, fontWeight: 950 }}>LEIA O REVIEW COMPLETO</div>
      </div>
      <div style={{ position: "absolute", left: 810, top: 600 }}>
        <Stickman pose="celebrate" scale={0.58} />
      </div>
      <ProductCard image={image} frame={frame} />
    </AbsoluteFill>
  );
};

export const StickmanReviewLandscape: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = landscapeCameraAt(frame, fps);
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = Math.max(1, Math.round((props.hookDuration ?? 3) * fps));
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, Math.ceil(props.totalDuration * fps - scenesEndFrame));
  const visualPlan = createSceneVisualPlan(props.scenes, props.title + "|" + props.category + "|stickman-review");

  return (
    <Background>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={0.96} />
      {props.musicUrl ? <Audio src={resolveMediaSource(props.musicUrl)} volume={0.07} /> : null}
      <AbsoluteFill style={{ transform: "translate3d(" + camera.x + "px," + camera.y + "px,0)" }}>
        <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
          <Opening title={props.title} category={props.category} hook={props.hook} image={image} score={props.score} />
        </Sequence>
        {props.scenes.map((scene, index) => (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)}
            premountFor={fps}
          >
            <StickmanScene
              scene={scene}
              index={index}
              count={props.scenes.length}
              title={props.title}
              category={props.category}
              image={props.productImages?.[index % Math.max(1, props.productImages.length)] || image}
              visual={visualPlan[index]}
            />
          </Sequence>
        ))}
        <Sequence from={scenesEndFrame} durationInFrames={closingDuration} premountFor={fps}>
          <Closing title={props.title} score={props.score} callToAction={props.callToAction} image={image} />
        </Sequence>
      </AbsoluteFill>
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg,rgba(4,8,16,.1),transparent 28%,transparent 72%,rgba(4,8,16,.45))" }} />
      {props.subtitleEntries.map((entry, index) => {
        const time = frame / fps;
        if (time < entry.start || time >= entry.end) return null;
        const progress = (time - entry.start) / Math.max(.01, entry.end - entry.start);
        const opacity = interpolate(progress, [0, .05, .92, 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <KineticCaption
            key={index}
            variant="landscape"
            text={entry.text}
            progress={progress}
            opacity={opacity}
            words={entry.words}
            time={time}
            fps={fps}
            maxVisibleWords={7}
          />
        );
      })}
    </Background>
  );
};

export default StickmanReviewLandscape;
