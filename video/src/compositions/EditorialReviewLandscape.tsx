import { AbsoluteFill, Audio, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { EditorialReviewProps, EditorialScene } from "./EditorialReview";

const palette = { background: "#0B0E15", text: "#F3F4F7", muted: "#AEB6C4", blue: "#55B9F2", orange: "#FF6848" };
const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden", background: "radial-gradient(ellipse at 65% 50%, #253246 0%, #151B29 48%, #080B12 100%)", color: palette.text, fontFamily: "Arial, Helvetica, sans-serif" }}>
    {children}
  </AbsoluteFill>
);
const Product: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={src} style={{ width: 700, height: 560, objectFit: "contain", ...style }} />
);
const Intro: React.FC<{ title: string; category: string; hook: string; imageUrl: string }> = ({ title, category, hook, imageUrl }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Background>
      <div style={{ position: "absolute", top: 135, left: 112, width: 1030, opacity }}>
        <div style={{ color: palette.blue, fontSize: 24, fontWeight: 800, letterSpacing: 5, textTransform: "uppercase" }}>Vetor • {category} • Guia de compra</div>
        <div style={{ marginTop: 28, fontSize: 76, lineHeight: 1.02, letterSpacing: -3, fontWeight: 900 }}>{hook}</div>
        <div style={{ marginTop: 28, color: palette.muted, fontSize: 29, fontWeight: 700 }}>{title}</div>
      </div>
      <Product src={imageUrl} style={{ position: "absolute", right: 60, top: 200 }} />
      <div style={{ position: "absolute", bottom: 48, left: 112, color: palette.muted, fontSize: 21, letterSpacing: 2 }}>ANÁLISE EDITORIAL • O QUE IMPORTA ANTES DE COMPRAR</div>
    </Background>
  );
};
const Detail: React.FC<{ scene: EditorialScene; index: number; count: number; category: string; imageUrl: string; brollUrl?: string }> = ({ scene, index, count, category, imageUrl, brollUrl }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 20], [42, 0], { extrapolateRight: "clamp" });
  return (
    <Background>
      {brollUrl ? <Video src={brollUrl} muted loop style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.13, filter: "brightness(.6)" }} /> : null}
      <div style={{ position: "absolute", top: 118, left: 112, right: 890, opacity, transform: "translateY(" + y + "px)" }}>
        <div style={{ color: palette.blue, fontSize: 23, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>{scene.visualCue || category}</div>
        <div style={{ marginTop: 30, fontSize: 48, lineHeight: 1.13, fontWeight: 850, letterSpacing: -1.5 }}>{scene.text}</div>
      </div>
      <Product src={imageUrl} style={{ position: "absolute", right: 42, top: 245 }} />
      <div style={{ position: "absolute", bottom: 48, left: 112, right: 112, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ color: palette.orange, fontSize: 24, fontWeight: 900 }}>{String(index + 1).padStart(2, "0")}</div>
        <div style={{ width: 90, height: 2, background: "rgba(255,255,255,.3)" }} />
        <div style={{ color: palette.muted, fontSize: 20, letterSpacing: 3 }}>{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</div>
      </div>
    </Background>
  );
};
const End: React.FC<{ title: string; score: number; callToAction: string; imageUrl: string }> = ({ title, score, callToAction, imageUrl }) => (
  <Background>
    <div style={{ position: "absolute", top: 165, left: 120, width: 1030 }}>
      <div style={{ color: palette.blue, fontSize: 25, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>{score > 0 ? "Nota editorial • " + score.toFixed(1) + " / 10" : "Veredito editorial"}</div>
      <div style={{ marginTop: 36, fontSize: 72, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3 }}>Vale a pena para o seu uso?</div>
      <div style={{ marginTop: 34, fontSize: 31, lineHeight: 1.25, color: palette.muted }}>{callToAction}</div>
      <div style={{ marginTop: 42, display: "inline-block", background: palette.orange, color: "#11141C", padding: "20px 34px", borderRadius: 18, fontSize: 28, fontWeight: 900 }}>{title}</div>
    </div>
    <Product src={imageUrl} style={{ position: "absolute", right: 50, top: 230 }} />
    <div style={{ position: "absolute", bottom: 42, left: 120, color: palette.muted, fontSize: 21 }}>Review completo e oferta atual na descrição</div>
  </Background>
);
const Captions: React.FC<{ entries: EditorialReviewProps["subtitleEntries"]; frame: number; fps: number }> = ({ entries, frame, fps }) => {
  const time = frame / fps;
  const entry = entries.find((item) => time >= item.start && time < item.end);
  if (!entry) return null;
  const opacity = interpolate((time - entry.start) / Math.max(0.01, entry.end - entry.start), [0, 0.08, 0.92, 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", zIndex: 20, bottom: 96, left: 140, right: 140, opacity, textAlign: "center" }}><span style={{ display: "inline-block", maxWidth: "100%", padding: "10px 18px", borderRadius: 12, background: "rgba(7,10,17,.86)", color: "#fff", fontSize: 30, lineHeight: 1.15, fontWeight: 700 }}>{entry.text}</span></div>;
};
export const EditorialReviewLandscape: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = (props.hookDuration ?? 3) * fps;
  const sceneEnd = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, props.totalDuration * fps - sceneEnd);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <Audio src={props.audioUrl} volume={0.94} />
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}><Intro title={props.title} category={props.category} hook={props.hook} imageUrl={image} /></Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)} premountFor={fps}>
          <Detail scene={scene} index={index} count={props.scenes.length} category={props.category} imageUrl={image} brollUrl={props.brollVideos?.[index % Math.max(1, props.brollVideos.length)]} />
        </Sequence>
      ))}
      <Sequence from={sceneEnd} durationInFrames={closingDuration} premountFor={fps}><End title={props.title} score={props.score} callToAction={props.callToAction} imageUrl={image} /></Sequence>
      <Captions entries={props.subtitleEntries} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
