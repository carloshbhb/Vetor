import React from 'react';
import {
  AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

type Style = {
  id: string; name: string; promise: string; detail: string; accent: string; mode: string;
};

const STYLES: Style[] = [
  { id: 'premium-product-3d', name: 'PREMIUM PRODUCT 3D', promise: 'PRESENÇA DE CINEMA', detail: 'Luz de estúdio • profundidade • hero shot', accent: '#D6B269', mode: 'premium' },
  { id: 'exploded-teardown', name: 'EXPLODED TEARDOWN', promise: 'VEJA POR DENTRO', detail: 'Camadas • construção • detalhes', accent: '#38D2DC', mode: 'exploded' },
  { id: 'hologram-hud', name: 'HOLOGRAM HUD', promise: 'DADOS EM MOVIMENTO', detail: 'Tela 12,1” • resolução 2,5K • bateria 12.000 mAh', accent: '#5AFFE1', mode: 'hud' },
  { id: 'kinetic-typography', name: 'KINETIC TYPOGRAPHY', promise: 'PALAVRAS QUE IMPACTAM', detail: 'Ritmo • escala • cortes tipográficos', accent: '#FF49A6', mode: 'type' },
  { id: 'isometric-explainer', name: 'ISOMETRIC EXPLAINER', promise: 'EXPLIQUE O ECOSSISTEMA', detail: 'Perspectiva • conexões • fluxo de uso', accent: '#5BCD91', mode: 'isometric' },
  { id: 'cinematic-2d', name: 'CINEMATIC 2D', promise: 'HISTÓRIA EM CAMADAS', detail: 'Parallax • silhuetas • profundidade', accent: '#FF975E', mode: 'cinematic' },
  { id: 'lifestyle-demo', name: 'LIFESTYLE DEMO', promise: 'MOSTRE NA VIDA REAL', detail: 'Estudo • streaming • trabalho • rotina', accent: '#FFC275', mode: 'lifestyle' },
  { id: 'data-storytelling', name: 'DATA STORYTELLING', promise: 'TRANSFORME SPECS EM HISTÓRIA', detail: '12,1” • 2,5K • 12.000 mAh', accent: '#599AFF', mode: 'data' },
  { id: 'comparison-arena', name: 'COMPARISON ARENA', promise: 'DECISÃO SEM ENROLAÇÃO', detail: 'Uso casual × produtividade móvel', accent: '#FF6868', mode: 'arena' },
  { id: 'editorial-luxury', name: 'EDITORIAL LUXURY', promise: 'MENOS RUÍDO. MAIS PRODUTO.', detail: 'Composição • tipografia • acabamento', accent: '#D8D0B8', mode: 'luxury' },
];

const INK = '#080C14';
const TABLET = '#9CA3AF';

const Tablet: React.FC<{ accent: string; scale?: number; rotate?: number; exploded?: boolean }> = ({ accent, scale = 1, rotate = -8, exploded = false }) => (
  <div style={{ position: 'relative', width: 560, height: 390, transform: `scale(${scale}) rotate(${rotate}deg) perspective(900px) rotateY(-12deg)`, filter: 'drop-shadow(0 40px 45px rgba(0,0,0,.55))' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: '#68717D', border: '3px solid #CBD0D8', transform: exploded ? 'translateY(28px)' : 'none' }} />
    <div style={{ position: 'absolute', inset: 13, borderRadius: 25, overflow: 'hidden', background: 'linear-gradient(135deg,#162B54,#09101F 58%,#233B6D)', border: '2px solid #202A3B', transform: exploded ? 'translateY(-30px)' : 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 72% 28%, ${accent}88, transparent 42%), linear-gradient(145deg,transparent 38%,#4285F4 39%,#1428A0 70%,#080C14 71%)` }} />
      <div style={{ position: 'absolute', left: 40, top: 35, width: 150, height: 4, background: '#FFFFFF66', borderRadius: 8 }} />
      <div style={{ position: 'absolute', left: 40, top: 53, width: 90, height: 4, background: '#FFFFFF33', borderRadius: 8 }} />
    </div>
    {exploded ? <div style={{ position: 'absolute', left: 28, right: 28, bottom: -32, height: 18, borderRadius: 8, background: accent, opacity: .85 }} /> : null}
    <div style={{ position: 'absolute', right: 22, top: 12, width: 6, height: 6, borderRadius: 8, background: '#111827' }} />
  </div>
);

const Metric: React.FC<{ label: string; value: string; accent: string; x?: number; y?: number }> = ({ label, value, accent, x = 0, y = 0 }) => (
  <div style={{ position: 'absolute', left: x, top: y, padding: '16px 20px', border: `1px solid ${accent}88`, background: '#08111DE8', borderRadius: 14, boxShadow: `0 0 30px ${accent}22` }}>
    <div style={{ fontSize: 18, letterSpacing: 3, color: accent, fontWeight: 800 }}>{label}</div>
    <div style={{ fontSize: 38, fontWeight: 900, color: '#F7FAFF', marginTop: 4 }}>{value}</div>
  </div>
);

const Motif: React.FC<{ style: Style; frame: number; fps: number }> = ({ style, frame, fps }) => {
  const p = interpolate(frame, [0, 150], [0, 1], { extrapolateRight: 'clamp' });
  const pulse = 1 + Math.sin(frame / 9) * .035;
  if (style.mode === 'premium') return <><div style={{ position: 'absolute', width: 700, height: 700, borderRadius: 700, border: `1px solid ${style.accent}55`, transform: `scale(${.7 + p * .4})`, boxShadow: `0 0 90px ${style.accent}22` }} /><div style={{ position: 'absolute', bottom: 430, width: 680, height: 70, borderRadius: '50%', background: `${style.accent}22`, filter: 'blur(30px)' }} /><Tablet accent={style.accent} scale={pulse} /></>;
  if (style.mode === 'exploded') return <><Tablet accent={style.accent} exploded scale={1.05} /><div style={{ position: 'absolute', width: 640, height: 1, background: style.accent, transform: `translateY(${Math.sin(frame / 8) * 8}px)` }} /><Metric label="CONSTRUÇÃO" value="EM CAMADAS" accent={style.accent} x={75} y={250} /></>;
  if (style.mode === 'hud') return <><Tablet accent={style.accent} scale={.94} /><div style={{ position: 'absolute', width: 650, height: 650, borderRadius: 650, border: `2px dashed ${style.accent}99`, transform: `rotate(${frame * .35}deg)` }} /><Metric label="TELA" value="12,1” • 2,5K" accent={style.accent} x={65} y={230} /><Metric label="BATERIA" value="12.000 mAh" accent={style.accent} x={460} y={1120} /></>;
  const typeScale = interpolate(frame, [0, 18], [.85, 1], { extrapolateRight: 'clamp' });
  if (style.mode === 'type') return <><div style={{ fontSize: 100, fontWeight: 1000, letterSpacing: -7, color: style.accent, textAlign: 'center', transform: `scale(${typeScale})`, textShadow: `0 0 45px ${style.accent}66` }}>TELA<br/>GIGANTE.</div><div style={{ fontSize: 42, fontWeight: 900, color: '#F7FAFF', letterSpacing: 8, marginTop: 32 }}>IDEIAS SEM LIMITE</div></>;
  if (style.mode === 'isometric') return <><div style={{ width: 440, height: 270, border: `3px solid ${style.accent}`, transform: 'rotateX(58deg) rotateZ(-35deg)', boxShadow: `30px 30px 0 ${style.accent}33`, background: `${style.accent}10` }} /><Tablet accent={style.accent} scale={.55} rotate={-25} /><div style={{ position: 'absolute', width: 300, height: 3, background: style.accent, transform: 'rotate(-35deg) translate(80px,-80px)' }} /></>;
  if (style.mode === 'cinematic') return <><div style={{ position: 'absolute', width: 850, height: 850, borderRadius: 850, background: `radial-gradient(circle,${style.accent}44,transparent 68%)`, transform: `translate(${Math.sin(frame / 20) * 22}px,${Math.cos(frame / 22) * 18}px)` }} /><Tablet accent={style.accent} scale={1.08} rotate={-4} /><div style={{ position: 'absolute', width: 900, height: 4, background: style.accent, transform: `translateY(${Math.sin(frame / 10) * 170}px)`, opacity: .45 }} /></>;
  if (style.mode === 'lifestyle') return <><div style={{ position: 'absolute', bottom: 330, width: 820, height: 230, borderRadius: 26, background: 'linear-gradient(90deg,#4B5563,#1F2937)', borderBottom: '16px solid #111827' }} /><div style={{ position: 'absolute', bottom: 565, width: 260, height: 170, borderRadius: '50%', background: `${style.accent}22`, filter: 'blur(35px)' }} /><Tablet accent={style.accent} scale={.88} rotate={-3} /><div style={{ position: 'absolute', top: 1130, fontSize: 28, color: '#F7FAFF', letterSpacing: 4 }}>ESTUDO • STREAMING • TRABALHO</div></>;
  if (style.mode === 'data') return <><Tablet accent={style.accent} scale={.55} rotate={-7} /><div style={{ position: 'absolute', bottom: 360, left: 100, right: 100, display: 'flex', alignItems: 'end', gap: 22, height: 270 }}>{[.55,.82,.68,1].map((v,i)=><div key={i} style={{ flex: 1, height: v*250, background: `linear-gradient(0deg,${style.accent}55,${style.accent})`, borderRadius: '12px 12px 0 0', transform: `scaleY(${interpolate(frame, [0,45], [0,1], { extrapolateRight: 'clamp' })})`, transformOrigin: 'bottom' }} />)}</div><div style={{ position: 'absolute', bottom: 285, fontSize: 22, color: '#DCE7F7' }}>TELA 12,1”  •  2,5K  •  12.000 mAh</div></>;
  if (style.mode === 'arena') return <><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: `${style.accent}18`, borderRight: `2px solid ${style.accent}` }} /><div style={{ position: 'absolute', top: 320, left: 90, fontSize: 32, fontWeight: 900, color: '#F7FAFF' }}>TABLET</div><div style={{ position: 'absolute', top: 320, right: 90, fontSize: 32, fontWeight: 900, color: style.accent }}>ROTINA</div><Tablet accent={style.accent} scale={.58} rotate={-7} /><div style={{ position: 'absolute', bottom: 330, fontSize: 30, color: '#F7FAFF', fontWeight: 800 }}>MOBILIDADE × PRODUTIVIDADE</div></>;
  return <><div style={{ position: 'absolute', top: 260, fontSize: 20, letterSpacing: 10, color: style.accent }}>VETOR • PRODUCT STUDY</div><Tablet accent={style.accent} scale={1.12} rotate={-2} /><div style={{ position: 'absolute', bottom: 340, width: 620, height: 1, background: style.accent }} /><div style={{ position: 'absolute', bottom: 285, fontSize: 24, letterSpacing: 5, color: '#F7FAFF' }}>REDMI PAD 2 PRO</div></>;
};

const StyleScene: React.FC<{ style: Style; index: number }> = ({ style, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 115, mass: .8 } });
  const opacity = interpolate(frame, [0, 12, 140, 150], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  const y = interpolate(enter, [0, 1], [80, 0]);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #172B49 0%, #0F1623 48%, #080C14 100%)', color: '#F7FAFF', alignItems: 'center', justifyContent: 'center', opacity }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${style.accent}18, transparent 55%)` }} />
      <div style={{ position: 'absolute', top: 130, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, letterSpacing: 5, fontWeight: 900, color: style.accent }}>VETOR LAB</div>
        <div style={{ fontSize: 20, color: '#AEB8C8' }}>ESTILO {String(index + 1).padStart(2,'0')} / 10</div>
      </div>
      <div style={{ position: 'absolute', top: 235, left: 70, right: 70, transform: `translateY(${y}px)`, textAlign: 'center' }}>
        <div style={{ color: style.accent, fontSize: 27, fontWeight: 900, letterSpacing: 4 }}>{style.name}</div>
        <div style={{ marginTop: 22, fontSize: 54, fontWeight: 950, letterSpacing: -2, lineHeight: 1.05 }}>{style.promise}</div>
      </div>
      <div style={{ position: 'absolute', top: 660, width: 980, height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Motif style={style} frame={frame} fps={fps} />
      </div>
      <div style={{ position: 'absolute', bottom: 210, left: 70, right: 70, textAlign: 'center', fontSize: 25, color: '#C7D2E2', letterSpacing: 1 }}>{style.detail}</div>
      <div style={{ position: 'absolute', bottom: 130, left: 72, right: 72, height: 4, background: '#FFFFFF22' }}>
        <div style={{ height: '100%', width: `${(frame / 150) * 100}%`, background: style.accent }} />
      </div>
    </AbsoluteFill>
  );
};

export const TemplateShowcase: React.FC<{ audioUrl: string }> = ({ audioUrl }) => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Audio src={staticFile(audioUrl)} volume={1} />
    {STYLES.map((style, index) => (
      <Sequence key={style.id} from={index * 150} durationInFrames={150}>
        <StyleScene style={style} index={index} />
      </Sequence>
    ))}
    <Sequence from={1500} durationInFrames={300}>
      <AbsoluteFill style={{ background: 'linear-gradient(145deg,#1428A0,#080C14)', alignItems: 'center', justifyContent: 'center', color: '#F7FAFF' }}>
        <div style={{ fontSize: 30, letterSpacing: 8, color: '#70C4FF' }}>VETOR • MOTION LAB</div>
        <div style={{ marginTop: 35, fontSize: 76, fontWeight: 950, textAlign: 'center', lineHeight: 1.05 }}>10 ESTILOS.<br/>UMA NOVA FORMA<br/>DE APRESENTAR PRODUTOS.</div>
        <div style={{ marginTop: 55, fontSize: 28, color: '#C7D2E2' }}>Qual direção merece virar padrão?</div>
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
