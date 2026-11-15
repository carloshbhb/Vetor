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
import { resolveMediaSource } from "../utils/media-source";

const C = {
  bg: "#070B12",
  panel: "#111A29",
  panel2: "#18263A",
  blue: "#4285F4",
  blue2: "#1C4FE0",
  cyan: "#8AD8FF",
  white: "#F8FBFF",
  muted: "#B8C5D8",
  amber: "#FFBD66",
  red: "#FF6B70",
  green: "#68E0B5",
};

type Pose = "present" | "point" | "think" | "warning" | "celebrate";

const SceneBackdrop: React.FC<{ tone?: "blue" | "warm" | "red" }> = ({ tone = "blue" }) => {
  const tint = tone === "red" ? "rgba(255,107,112,.12)" : tone === "warm" ? "rgba(255,189,102,.12)" : "rgba(66,133,244,.18)";
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "linear-gradient(125deg,#070B12 0%,#0D1625 58%,#080E18 100%)" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 72% 42%," + tint + " 0%,transparent 46%)" }} />
      <AbsoluteFill style={{ opacity: .16, backgroundImage: "linear-gradient(rgba(138,216,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(138,216,255,.12) 1px,transparent 1px)", backgroundSize: "80px 80px", maskImage: "linear-gradient(90deg,transparent,#000 45%,#000)" }} />
      <div style={{ position: "absolute", width: 760, height: 760, right: -260, top: -350, borderRadius: "50%", border: "1px solid rgba(138,216,255,.12)" }} />
      <div style={{ position: "absolute", width: 570, height: 570, right: -165, top: -255, borderRadius: "50%", border: "1px solid rgba(138,216,255,.10)" }} />
    </AbsoluteFill>
  );
};

const Mascot: React.FC<{ pose?: Pose; size?: number }> = ({ pose = "present", size = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bob = Math.sin((frame / fps) * Math.PI * 2 * .9) * 4;
  const wave = Math.sin((frame / fps) * Math.PI * 2 * 1.35);
  const blink = Math.floor(frame / 68) % 4 === 0 && frame % 68 < 4;
  const leftAngle = pose === "celebrate" ? -48 + wave * 5 : pose === "warning" ? -25 : pose === "think" ? -18 : pose === "point" ? -16 : -35 + wave * 4;
  const rightAngle = pose === "celebrate" ? -132 - wave * 5 : pose === "warning" ? 25 : pose === "think" ? -140 : pose === "point" ? -154 : -145 - wave * 4;
  const arm = (angle: number, side: number) => {
    const r = angle * Math.PI / 180;
    const x = 130 + Math.cos(r) * 72;
    const y = 158 + Math.sin(r) * 72;
    const x2 = x + Math.cos(r + (side ? -.32 : .32)) * 55;
    const y2 = y + Math.sin(r + (side ? -.32 : .32)) * 55;
    return "M130 158 L" + x.toFixed(1) + " " + y.toFixed(1) + " L" + x2.toFixed(1) + " " + y2.toFixed(1);
  };
  const line = "#07101D";
  return (
    <div style={{ width: size, height: size * 1.22, transform: "translateY(" + bob + "px)" }}>
      <svg viewBox="0 0 260 318" width="100%" height="100%" aria-label="Mascote Vetor">
        <ellipse cx="130" cy="300" rx="75" ry="12" fill="rgba(0,0,0,.28)" />
        <g stroke={line} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d={arm(leftAngle, 0)} />
          <path d={arm(rightAngle, 1)} />
          <path d="M130 205 L91 262 L79 287" />
          <path d="M130 205 L169 262 L181 287" />
        </g>
        <path d="M98 116 Q130 102 162 116 L171 204 Q130 227 89 204 Z" fill="#1C4FE0" stroke={line} strokeWidth="11" />
        <path d="M117 126 L130 154 L143 126" fill="none" stroke="#8AD8FF" strokeWidth="6" strokeLinecap="round" />
        <rect x="112" y="166" width="36" height="24" rx="7" fill="#8AD8FF" stroke={line} strokeWidth="5" />
        <circle cx="130" cy="67" r="53" fill="#F8FBFF" stroke={line} strokeWidth="11" />
        <path d="M91 47 Q100 13 130 14 Q161 14 170 47" fill="#4285F4" stroke={line} strokeWidth="10" />
        <g fill={line}>
          {blink ? (
            <>
              <path d="M108 65 Q116 70 123 65" stroke={line} strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M138 65 Q146 70 153 65" stroke={line} strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="116" cy="64" r="5" />
              <circle cx="146" cy="64" r="5" />
            </>
          )}
        </g>
        <path d={pose === "warning" ? "M112 91 Q130 78 148 91" : "M111 84 Q130 103 149 84"} stroke={line} strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <path d="M73 292 Q91 280 105 292" stroke={line} strokeWidth="13" strokeLinecap="round" />
        <path d="M155 292 Q169 280 187 292" stroke={line} strokeWidth="13" strokeLinecap="round" />
        <circle cx="185" cy="135" r="8" fill="#8AD8FF" />
      </svg>
    </div>
  );
};

const ProductHero: React.FC<{ image: string; frame: number; size?: number; crop?: boolean }> = ({ image, frame, size = 1, crop = false }) => {
  const zoom = interpolate(frame, [0, 18, 120], [0.94, 1.02, 1.09], { extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 25) * 8;
  return (
    <div style={{
      position: "absolute",
      right: 120,
      top: 160,
      width: 690 * size,
      height: 690 * size,
      borderRadius: 42,
      overflow: "hidden",
      background: "#F7F8FA",
      border: "1px solid rgba(255,255,255,.72)",
      boxShadow: "0 35px 100px rgba(0,0,0,.48),0 0 0 12px rgba(138,216,255,.04)",
    }}>
      <Img
        src={resolveMediaSource(image)}
        style={{
          position: "absolute",
          inset: crop ? -35 : 0,
          width: crop ? "calc(100% + 70px)" : "100%",
          height: crop ? "calc(100% + 70px)" : "100%",
          objectFit: crop ? "cover" : "contain",
          objectPosition: crop ? "48% 48%" : "center",
          transform: "translateY(" + drift + "px) scale(" + zoom * (crop ? 1.12 : 1) + ")",
          filter: "drop-shadow(0 24px 25px rgba(0,0,0,.16))",
        }}
      />
      <div style={{ position: "absolute", left: 20, bottom: 18, padding: "9px 13px", borderRadius: 8, color: "#172338", background: "rgba(255,255,255,.88)", fontSize: 14, fontWeight: 900, letterSpacing: 2 }}>
        PRODUTO EM FOCO
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; tone?: "blue" | "warm" | "red" }> = ({ children, tone = "blue" }) => (
  <div style={{ color: tone === "red" ? C.red : tone === "warm" ? C.amber : C.cyan, fontSize: 18, fontWeight: 950, letterSpacing: 4, textTransform: "uppercase" }}>
    {children}
  </div>
);

const MainTitle: React.FC<{ children: React.ReactNode; size?: number; width?: number }> = ({ children, size = 76, width = 780 }) => (
  <div style={{ maxWidth: width, marginTop: 23, color: C.white, fontSize: size, lineHeight: .98, fontWeight: 950, letterSpacing: -3.5 }}>
    {children}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; tone?: "blue" | "warm" | "red" }> = ({ children, tone = "blue" }) => {
  const color = tone === "red" ? C.red : tone === "warm" ? C.amber : C.cyan;
  return (
    <div style={{ display: "inline-flex", padding: "12px 17px", border: "1px solid " + color + "55", borderRadius: 12, background: color + "16", color, fontSize: 19, fontWeight: 900, letterSpacing: 1 }}>
      {children}
    </div>
  );
};

const SceneMeta: React.FC<{ category: string; index: number; total: number }> = ({ category, index, total }) => (
  <>
    <div style={{ position: "absolute", top: 54, left: 74, color: "rgba(248,251,255,.72)", fontSize: 16, fontWeight: 900, letterSpacing: 3 }}>
      VETOR / {category.toUpperCase()}
    </div>
    <div style={{ position: "absolute", top: 50, right: 76, color: "rgba(248,251,255,.62)", fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>
      {String(index).padStart(2, "0")} <span style={{ color: "rgba(248,251,255,.32)" }}>/ {String(total).padStart(2, "0")}</span>
    </div>
    <div style={{ position: "absolute", top: 89, left: 74, right: 76, height: 2, background: "rgba(255,255,255,.12)" }}>
      <div style={{ height: "100%", width: ((index + 1) / total) * 100 + "%", background: "linear-gradient(90deg,#1C4FE0,#8AD8FF)" }} />
    </div>
  </>
);

const Entrance: React.FC<{ children: React.ReactNode; duration: number; tone?: "blue" | "warm" | "red" }> = ({ children, duration, tone = "blue" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 9, duration], [0, 1, 1, 0.94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(frame, [0, 17], [28, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, transform: "translateY(" + lift + "px)" }}>
      <SceneBackdrop tone={tone} />
      {children}
    </AbsoluteFill>
  );
};

const Opening: React.FC<{ title: string; category: string; hook: string; image: string; score: number; duration: number }> = ({ title, category, hook, image, score, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 85 } });
  return (
    <Entrance duration={duration}>
      <SceneMeta category={category} index={1} total={9} />
      <div style={{ position: "absolute", left: 90, top: 178, width: 800 }}>
        <Eyebrow>REVIEW SEM ENROLAÇÃO</Eyebrow>
        <MainTitle size={88} width={770}>{hook}</MainTitle>
        <div style={{ marginTop: 28, color: C.muted, fontSize: 27, fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: 30, display: "flex", gap: 13 }}>
          <Tag>TESTE DE RECURSOS</Tag>
          <Tag tone="warm">PRÓS E LIMITES</Tag>
        </div>
      </div>
      <div style={{ position: "absolute", left: 95, bottom: 112, transform: "translateY(" + (1 - reveal) * 45 + "px) scale(" + interpolate(reveal, [0, 1], [.82, 1]) + ")" }}>
        <Mascot pose="present" size={245} />
      </div>
      <ProductHero image={image} frame={frame} size={.88} />
      <div style={{ position: "absolute", right: 170, bottom: 92, color: "rgba(248,251,255,.48)", fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>
        AVALIAÇÃO VETOR · {score.toFixed(1)}/10
      </div>
    </Entrance>
  );
};

const BatteryVisual: React.FC<{ frame: number }> = ({ frame }) => {
  const progress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 100, top: 350, width: 440, height: 300 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <div style={{ fontSize: 178, fontWeight: 1000, lineHeight: .8, letterSpacing: -12, color: C.white }}>13</div>
        <div style={{ fontSize: 53, fontWeight: 950, color: C.cyan }}>DIAS</div>
      </div>
      <div style={{ marginTop: 26, color: C.muted, fontSize: 25, fontWeight: 750 }}>autonomia informada pela Samsung</div>
      <div style={{ marginTop: 34, width: 400, height: 13, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,.14)" }}>
        <div style={{ height: "100%", width: progress * 100 + "%", borderRadius: 20, background: "linear-gradient(90deg,#1C4FE0,#8AD8FF)" }} />
      </div>
      <div style={{ marginTop: 14, color: "rgba(248,251,255,.48)", fontSize: 14, fontWeight: 900, letterSpacing: 2 }}>DURAÇÃO MÁXIMA DECLARADA · USO TÍPICO</div>
    </div>
  );
};

const WaterVisual: React.FC<{ frame: number }> = ({ frame }) => {
  const bob = Math.sin(frame / 16) * 9;
  return (
    <div style={{ position: "absolute", left: 100, top: 300 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
        <div style={{ color: C.white, fontSize: 135, fontWeight: 1000, letterSpacing: -8 }}>5 ATM</div>
        <div style={{ color: C.cyan, fontSize: 68, fontWeight: 950 }}>IP68</div>
      </div>
      <div style={{ marginTop: 26, color: C.muted, fontSize: 29, fontWeight: 800 }}>proteção para água e poeira</div>
      <svg width="430" height="170" viewBox="0 0 430 170" style={{ marginTop: 25, transform: "translateY(" + bob + "px)" }}>
        <path d="M10 105 Q110 65 215 105 T420 105" stroke="#8AD8FF" strokeWidth="5" fill="none" opacity=".9" />
        <path d="M10 135 Q110 95 215 135 T420 135" stroke="#4285F4" strokeWidth="4" fill="none" opacity=".65" />
        {[65,145,245,335].map((x,i) => <circle key={x} cx={x} cy={35 + (i%2)*20} r={7 + (i%2)*3} fill="#8AD8FF" opacity={.7 + .25*Math.sin(frame/12+i)} />)}
      </svg>
    </div>
  );
};

const SensorGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const items = [
    { label: "FREQUÊNCIA\nCARDÍACA", glyph: "♥" },
    { label: "OXIGÊNIO\nNO SANGUE", glyph: "O₂" },
    { label: "SONO", glyph: "☾" },
    { label: "MOVIMENTO", glyph: "↗" },
  ];
  return (
    <div style={{ position: "absolute", left: 90, top: 300, display: "grid", gridTemplateColumns: "repeat(2,250px)", gap: 15 }}>
      {items.map((item,i) => {
        const enter = spring({ frame: Math.max(0, frame - i * 5), fps: 30, config: { damping: 14, stiffness: 100 } });
        return (
          <div key={item.label} style={{ width: 250, height: 145, borderRadius: 22, border: "1px solid rgba(138,216,255,.24)", background: "linear-gradient(145deg,rgba(24,38,58,.94),rgba(13,22,37,.9))", padding: 22, boxSizing: "border-box", opacity: enter, transform: "translateY(" + (1-enter)*20 + "px)" }}>
            <div style={{ color: i === 0 ? C.red : C.cyan, fontSize: 38, fontWeight: 950 }}>{item.glyph}</div>
            <div style={{ marginTop: 10, whiteSpace: "pre-line", color: C.white, fontSize: 16, fontWeight: 900, letterSpacing: 1.5, lineHeight: 1.2 }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const TradeoffVisual: React.FC<{ frame: number; text: string }> = ({ frame, text }) => {
  const isGps = /gps/i.test(text);
  const label = isGps ? "GPS INTEGRADO" : "NFC";
  const sub = isGps ? "A rota depende do celular" : "Não paga por aproximação";
  const pulse = 1 + Math.sin(frame / 8) * .035;
  return (
    <div style={{ position: "absolute", left: 100, top: 310, width: 650 }}>
      <Eyebrow tone="red">O QUE FALTA</Eyebrow>
      <MainTitle size={82} width={660}>SEM {label}</MainTitle>
      <div style={{ marginTop: 22, color: C.muted, fontSize: 30, fontWeight: 800 }}>{sub}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 38 }}>
        <div style={{ width: 138, height: 138, borderRadius: 28, border: "2px solid rgba(255,107,112,.6)", background: "rgba(255,107,112,.1)", display: "grid", placeItems: "center", transform: "scale(" + pulse + ")" }}>
          <div style={{ color: C.red, fontSize: isGps ? 60 : 72, fontWeight: 1000 }}>{isGps ? "⌖" : "N"}</div>
        </div>
        <div style={{ color: "rgba(248,251,255,.42)", fontSize: 36, fontWeight: 900 }}>≠</div>
        <div style={{ width: 138, height: 138, borderRadius: 28, border: "2px solid rgba(138,216,255,.3)", background: "rgba(66,133,244,.1)", display: "grid", placeItems: "center" }}>
          <div style={{ color: C.cyan, fontSize: 65, fontWeight: 1000 }}>{isGps ? "▣" : "⌚"}</div>
        </div>
      </div>
      <div style={{ marginTop: 22, color: C.red, fontSize: 16, fontWeight: 950, letterSpacing: 2 }}>PONTO DE ATENÇÃO ANTES DA COMPRA</div>
    </div>
  );
};

const SpecificationVisual: React.FC<{ frame: number; scene: EditorialScene; index: number }> = ({ frame, scene, index }) => {
  const reveal = spring({ frame, fps: 30, config: { damping: 18, stiffness: 90 } });
  const isResolution = /256|402|resolução/i.test(scene.text);
  const metric = isResolution ? "256 × 402" : index === 0 ? "1,6″" : "AMOLED";
  const line1 = index === 0 ? "ALUMÍNIO + AMOLED" : isResolution ? "RESOLUÇÃO DA TELA" : "TELA AMOLED";
  const line2 = index === 0 ? "corpo metálico e painel vibrante" : isResolution ? "mais espaço para notificações e treino" : "painel para leitura nítida";
  return (
    <div style={{ position: "absolute", left: 96, top: 315, width: 625, opacity: reveal, transform: "translateY(" + (1-reveal)*24 + "px)" }}>
      <Eyebrow>CONSTRUÇÃO E TELA</Eyebrow>
      <MainTitle size={73} width={640}>{line1}</MainTitle>
      <div style={{ marginTop: 28, color: C.cyan, fontSize: isResolution ? 85 : 105, lineHeight: 1, fontWeight: 1000, letterSpacing: -5 }}>{metric}</div>
      <div style={{ marginTop: 15, color: C.muted, fontSize: 25, fontWeight: 750 }}>{line2}</div>
      <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
        <Tag>VISOR RETANGULAR</Tag>
        <Tag>USO DIÁRIO</Tag>
      </div>
    </div>
  );
};

const FeatureScene: React.FC<{
  scene: EditorialScene;
  index: number;
  count: number;
  category: string;
  image: string;
}> = ({ scene, index, count, category, image }) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, scene.endFrame - scene.startFrame);
  const text = (scene.text + " " + (scene.visualCue || "")).toLowerCase();
  const isBattery = /bateria|13 dias|autonomia/.test(text);
  const isWater = /5 atm|ip68|água|poeira/.test(text);
  const isSensors = /frequência|oxigênio|sono|sensores|movimento/.test(text);
  const isTradeoff = /gps|nfc|sem gps|sem nfc/.test(text);
  const isSpecs = /amoled|alumínio|polegada|256|402|resolução/.test(text);
  const tone = isTradeoff ? "red" : isWater ? "warm" : "blue";
  const imageSize = isSensors ? .67 : .78;

  return (
    <Entrance duration={duration} tone={tone}>
      <SceneMeta category={category} index={index + 2} total={count + 2} />
      <div style={{ position: "absolute", left: 94, top: 145, color: "rgba(248,251,255,.44)", fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>
        {scene.visualCue || "ANÁLISE DO PRODUTO"}
      </div>
      {isBattery ? (
        <>
          <div style={{ position: "absolute", left: 96, top: 205, width: 650 }}>
            <Eyebrow>UM DOS PONTOS FORTES</Eyebrow>
            <MainTitle size={70} width={650}>AUTONOMIA PARA DURAR</MainTitle>
          </div>
          <BatteryVisual frame={frame} />
          <ProductHero image={image} frame={frame} size={imageSize} />
        </>
      ) : isWater ? (
        <>
          <div style={{ position: "absolute", left: 96, top: 205, width: 650 }}>
            <Eyebrow tone="warm">RESISTÊNCIA</Eyebrow>
            <MainTitle size={72} width={650}>PRONTA PARA A ROTINA</MainTitle>
          </div>
          <WaterVisual frame={frame} />
          <ProductHero image={image} frame={frame} size={imageSize} />
        </>
      ) : isSensors ? (
        <>
          <div style={{ position: "absolute", left: 90, top: 205, width: 700 }}>
            <Eyebrow>ACOMPANHAMENTO DIÁRIO</Eyebrow>
            <MainTitle size={67} width={680}>MAIS DADOS NO SEU PULSO</MainTitle>
          </div>
          <SensorGrid frame={frame} />
          <ProductHero image={image} frame={frame} size={imageSize} />
        </>
      ) : isTradeoff ? (
        <>
          <TradeoffVisual frame={frame} text={text} />
          <ProductHero image={image} frame={frame} size={.62} />
          <div style={{ position: "absolute", left: 750, bottom: 155 }}>
            <Mascot pose="warning" size={165} />
          </div>
        </>
      ) : isSpecs ? (
        <>
          <SpecificationVisual frame={frame} scene={scene} index={index} />
          <ProductHero image={image} frame={frame} size={.78} crop={index === 1} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left: 96, top: 245, width: 720 }}>
            <Eyebrow>VETOR EXPLICA</Eyebrow>
            <MainTitle>{scene.visualCue || "O QUE VOCÊ PRECISA SABER"}</MainTitle>
          </div>
          <ProductHero image={image} frame={frame} size={.78} />
          <div style={{ position: "absolute", left: 90, bottom: 145 }}>
            <Mascot pose="point" size={170} />
          </div>
        </>
      )}
    </Entrance>
  );
};

const OpeningAndClosing: React.FC<{
  closing?: boolean;
  title: string;
  hook: string;
  category: string;
  image: string;
  score: number;
  callToAction: string;
  duration: number;
}> = ({ closing = false, title, hook, category, image, score, callToAction, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, stiffness: 90 } });
  if (!closing) {
    return (
      <Entrance duration={duration}>
        <SceneMeta category={category} index={0} total={7} />
        <div style={{ position: "absolute", left: 92, top: 195, width: 800, transform: "translateY(" + (1-enter)*24 + "px)" }}>
          <Eyebrow>REVIEW SEM ENROLAÇÃO</Eyebrow>
          <MainTitle size={88} width={790}>{hook}</MainTitle>
          <div style={{ marginTop: 24, color: C.muted, fontSize: 27, fontWeight: 800 }}>{title}</div>
          <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
            <Tag>PRÓS E CONTRAS</Tag>
            <Tag tone="warm">VEREDITO REAL</Tag>
          </div>
        </div>
        <div style={{ position: "absolute", left: 90, bottom: 85 }}>
          <Mascot pose="present" size={225} />
        </div>
        <ProductHero image={image} frame={frame} size={.86} />
      </Entrance>
    );
  }

  return (
    <Entrance duration={duration}>
      <SceneMeta category={category} index={9} total={9} />
      <div style={{ position: "absolute", left: 100, top: 240, width: 730 }}>
        <Eyebrow>VEREDITO VETOR</Eyebrow>
        <div style={{ marginTop: 22, color: C.cyan, fontSize: 142, lineHeight: .9, fontWeight: 1000, letterSpacing: -9 }}>{score.toFixed(1)}<span style={{ fontSize: 72 }}>/10</span></div>
        <MainTitle size={57} width={680}>{title}</MainTitle>
        <div style={{ marginTop: 25, maxWidth: 650, color: C.muted, fontSize: 26, fontWeight: 750, lineHeight: 1.25 }}>{callToAction}</div>
        <div style={{ marginTop: 32, display: "inline-flex", padding: "17px 24px", borderRadius: 14, color: "#fff", background: "linear-gradient(100deg,#1C4FE0,#4285F4)", fontSize: 18, fontWeight: 950, letterSpacing: 1 }}>
          LEIA O REVIEW COMPLETO NO VETOR.BLOG
        </div>
      </div>
      <ProductHero image={image} frame={frame} size={.74} />
      <div style={{ position: "absolute", left: 715, bottom: 72 }}>
        <Mascot pose="celebrate" size={155} />
      </div>
    </Entrance>
  );
};

const Caption: React.FC<{ text: string; progress: number }> = ({ text, progress }) => {
  const lift = interpolate(progress, [0, .12], [16, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 250, right: 250, bottom: 38, minHeight: 62, display: "flex", justifyContent: "center", alignItems: "center", padding: "12px 24px", borderRadius: 12, background: "rgba(3,8,16,.84)", border: "1px solid rgba(138,216,255,.25)", opacity: interpolate(progress, [0, .06, .9, 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), transform: "translateY(" + lift + "px)" }}>
      <div style={{ color: C.white, textAlign: "center", fontSize: 27, lineHeight: 1.2, fontWeight: 750, textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>{text}</div>
    </div>
  );
};

export const StickmanReviewLandscape: React.FC<EditorialReviewProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const image = props.productImages?.[0] || props.imageUrl;
  const hookFrames = Math.max(1, Math.round((props.hookDuration ?? 3) * fps));
  const scenesEndFrame = props.scenes.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames);
  const closingDuration = Math.max(1, Math.ceil(props.totalDuration * fps - scenesEndFrame));
  return (
    <AbsoluteFill style={{ color: C.white, fontFamily: "Inter,DM Sans,Arial,sans-serif", background: C.bg }}>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={0.97} />
      {props.musicUrl ? <Audio src={resolveMediaSource(props.musicUrl)} volume={0.055} /> : null}
      <Sequence from={0} durationInFrames={hookFrames} premountFor={fps}>
        <OpeningAndClosing title={props.title} category={props.category} hook={props.hook} image={image} score={props.score} callToAction={props.callToAction} duration={hookFrames} />
      </Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1,scene.endFrame-scene.startFrame)} premountFor={fps}>
          <FeatureScene scene={scene} index={index} count={props.scenes.length} category={props.category} image={props.productImages?.[index % Math.max(1,props.productImages.length)] || image} />
        </Sequence>
      ))}
      <Sequence from={scenesEndFrame} durationInFrames={closingDuration} premountFor={fps}>
        <OpeningAndClosing closing title={props.title} hook={props.hook} category={props.category} image={image} score={props.score} callToAction={props.callToAction} duration={closingDuration} />
      </Sequence>
      {props.subtitleEntries.map((entry, index) => {
        const time = frame / fps;
        if (time < entry.start || time >= entry.end) return null;
        const progress = (time - entry.start) / Math.max(.01, entry.end - entry.start);
        return <Caption key={index} text={entry.text} progress={progress} />;
      })}
    </AbsoluteFill>
  );
};

export default StickmanReviewLandscape;
