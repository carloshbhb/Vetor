import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { resolveMediaSource } from '../utils/media-source';

type ComicScene = {
  id: number;
  kind: 'hook' | 'rotate' | 'smart' | 'truth' | 'room' | 'verdict';
  startFrame: number;
  endFrame: number;
  narration: string;
};

export type HY300ComicShortProps = {
  title: string;
  imageUrl: string;
  audioUrl: string;
  musicUrl?: string;
  scenes: ComicScene[];
  totalDuration: number;
  fps: number;
};

const K = {
  ink: '#141414',
  yellow: '#F7EF58',
  lime: '#D5FF2C',
  paper: '#F0E5CF',
  red: '#E94B45',
  blue: '#373BC2',
  white: '#FFFDF7',
  muted: '#716B60',
  mint: '#D5E9D2',
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const burstPath = (cx: number, cy: number, points = 16, outer = 210, inner = 155) => {
  const path = Array.from({ length: points * 2 }, (_, i) => {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  return 'M' + path.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' L') + ' Z';
};

const Paper: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = K.paper, children }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: color, color: K.ink, fontFamily: 'Syne, Arial Black, sans-serif' }}>
    <AbsoluteFill style={{
      pointerEvents: 'none',
      opacity: color === K.paper ? 0.17 : 0.08,
      backgroundImage: 'radial-gradient(rgba(20,20,20,.52) .65px, transparent .8px)',
      backgroundSize: '9px 9px',
      mixBlendMode: 'multiply',
    }} />
    {children}
  </AbsoluteFill>
);

const InkLines: React.FC<{ frame: number; color?: string; side?: 'left' | 'right' | 'both' }> = ({ frame, color = K.ink, side = 'both' }) => {
  const dash = interpolate(frame, [0, 18], [180, 0], clamp);
  return (
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: 13 }, (_, i) => {
        const y = 220 + i * 115;
        return (
          <g key={i} opacity={0.34 + (i % 3) * 0.12} stroke={color} strokeWidth={i % 4 === 0 ? 8 : 4} strokeLinecap="round" fill="none">
            {(side === 'both' || side === 'left') && <path d={'M-80 ' + y + ' Q 90 ' + (y - 28) + ' 270 ' + (y + 12)} strokeDasharray="280" strokeDashoffset={dash} />}
            {(side === 'both' || side === 'right') && <path d={'M810 ' + (y + 18) + ' Q 980 ' + (y - 30) + ' 1160 ' + y} strokeDasharray="280" strokeDashoffset={dash} />}
          </g>
        );
      })}
    </svg>
  );
};

const ComicBurst: React.FC<{ x?: number; y?: number; color?: string; frame: number; scale?: number }> = ({ x = 540, y = 670, color = K.red, frame, scale = 1 }) => {
  const s = spring({ frame, fps: 30, config: { damping: 10, stiffness: 190, mass: 0.55 } });
  const rotate = interpolate(frame, [0, 30], [-10, 8]);
  return (
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <path d={burstPath(x, y, 17, 245, 178)} fill={color} stroke={K.ink} strokeWidth="11" strokeLinejoin="round"
        transform={'translate(' + x + ' ' + y + ') scale(' + (s * scale) + ') rotate(' + rotate + ') translate(' + -x + ' ' + -y + ')'} />
    </svg>
  );
};

const ProjectorMascot: React.FC<{ frame: number; x?: number; y?: number; scale?: number; energy?: number }> = ({ frame, x = 590, y = 1110, scale = 1, energy = 1 }) => {
  const bob = Math.sin(frame * 0.42) * 13 * energy;
  const gait = Math.sin(frame * 0.52) * 27 * energy;
  const tilt = Math.sin(frame * 0.28) * 6 * energy;
  return (
    <div style={{ position: 'absolute', left: x, top: y + bob, width: 360, height: 360, transform: 'translate(-50%,-50%) scale(' + scale + ') rotate(' + tilt + 'deg)', transformOrigin: '50% 55%' }}>
      <svg viewBox="0 0 360 360" width="100%" height="100%" overflow="visible">
        <g stroke={K.ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          <g transform={'rotate(' + (-gait * 0.45) + ' 104 222)'}>
            <path d="M112 215 Q80 245 75 284" fill="none" strokeWidth="14" />
            <path d="M49 281 Q30 292 42 311 L89 313 Q108 300 91 284Z" fill={K.red} />
            <path d="M48 309 L89 309" fill="none" strokeWidth="5" />
          </g>
          <g transform={'rotate(' + (gait * 0.5) + ' 235 222)'}>
            <path d="M228 215 Q266 242 265 282" fill="none" strokeWidth="14" />
            <path d="M246 281 Q235 299 253 313 L301 309 Q316 295 291 281Z" fill={K.blue} />
            <path d="M254 307 L300 304" fill="none" strokeWidth="5" />
          </g>
          <g transform={'rotate(' + (gait * 0.7) + ' 60 145)'}>
            <path d="M91 147 Q55 128 34 92" fill="none" strokeWidth="14" />
            <path d="M25 84 Q5 70 18 53 Q32 42 49 61 L62 84 Q48 103 25 84Z" fill={K.white} />
            <path d="M20 64 L38 75" fill="none" strokeWidth="5" />
          </g>
          <g transform={'rotate(' + (-gait * 0.65) + ' 294 145)'}>
            <path d="M269 150 Q311 133 319 92" fill="none" strokeWidth="14" />
            <path d="M312 91 Q299 71 318 56 Q342 51 347 76 L338 101 Q320 111 312 91Z" fill={K.white} />
            <path d="M322 70 L338 82" fill="none" strokeWidth="5" />
          </g>
          <path d="M78 105 Q83 48 158 40 L249 58 Q280 72 277 149 L262 222 Q250 248 184 249 L103 228 Q75 208 78 105Z" fill={K.white} />
          <ellipse cx="160" cy="127" rx="75" ry="76" fill={K.ink} />
          <ellipse cx="160" cy="127" rx="54" ry="55" fill="#34343A" stroke="#888" strokeWidth="5" />
          <ellipse cx="148" cy="115" rx="22" ry="23" fill="#75C8FF" stroke="#B9E8FF" strokeWidth="4" />
          <ellipse cx="146" cy="112" rx="8" ry="9" fill={K.white} stroke="none" />
          <path d="M212 185 Q228 198 246 184" fill="none" strokeWidth="7" />
          <path d="M95 204 Q137 226 208 222" fill="none" stroke="#AAA" strokeWidth="4" />
          <path d="M105 238 Q176 261 249 239 L270 267 Q183 294 84 260Z" fill="#DADADA" />
          <path d="M120 258 L120 277 M143 263 L143 282 M166 266 L166 285 M189 266 L189 284 M212 263 L212 281" fill="none" strokeWidth="5" />
          <path d="M92 268 L85 284 M265 263 L281 280" fill="none" stroke={K.ink} strokeWidth="7" />
          <path d="M123 90 Q130 75 144 72" fill="none" stroke={K.white} strokeWidth="5" />
        </g>
        <path d="M56 28 L67 4 L81 30 M288 27 L307 9 L309 39" fill="none" stroke={K.red} strokeWidth="9" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const ProductSticker: React.FC<{ src: string; frame: number; x: number; y: number; width: number; height: number; rotation?: number; revealAt?: number }> = ({ src, frame, x, y, width, height, rotation = 0, revealAt = 0 }) => {
  const local = Math.max(0, frame - revealAt);
  const pop = spring({ frame: local, fps: 30, config: { damping: 11, stiffness: 150, mass: 0.72 } });
  const from = rotation < 0 ? rotation - 16 : rotation + 16;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width, height, padding: 12,
      background: K.white, border: '8px solid ' + K.ink,
      boxShadow: '16px 18px 0 rgba(20,20,20,.22)',
      transform: 'translate(-50%,-50%) rotate(' + interpolate(pop, [0, 1], [from, rotation]) + 'deg) scale(' + interpolate(pop, [0, 1], [.45, 1]) + ')',
      opacity: interpolate(local, [0, 5], [0, 1], clamp),
      clipPath: 'polygon(2% 0,98% 1%,100% 97%,4% 100%,0 75%)',
    }}>
      <Img src={resolveMediaSource(src)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  );
};

const HandArrow: React.FC<{ frame: number; color?: string; rotate?: number }> = ({ frame, color = K.ink, rotate = 0 }) => (
  <svg viewBox="0 0 420 250" width="420" height="250" style={{ position: 'absolute', right: 20, bottom: 50, transform: 'rotate(' + rotate + 'deg)' }}>
    <path d="M20 210 Q80 8 260 60 Q312 74 340 110" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray="430" strokeDashoffset={interpolate(frame, [0, 28], [430, 0], clamp)} />
    <path d="M286 54 L348 118 L365 35" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity={interpolate(frame, [12, 25], [0, 1], clamp)} />
  </svg>
);

const Word: React.FC<{ children: React.ReactNode; size?: number; color?: string; italic?: boolean; rotate?: number; style?: React.CSSProperties }> = ({ children, size = 120, color = K.ink, italic = false, rotate = 0, style }) => (
  <div style={{ color, fontSize: size, fontWeight: 1000, lineHeight: .82, letterSpacing: '-.075em', textTransform: 'uppercase', fontFamily: italic ? 'Georgia, Times New Roman, serif' : 'Bebas Neue, Impact, sans-serif', fontStyle: italic ? 'italic' : 'normal', transform: 'rotate(' + rotate + 'deg)', textShadow: italic ? '2px 4px 0 rgba(20,20,20,.08)' : '4px 5px 0 rgba(20,20,20,.12)', ...style }}>
    {children}
  </div>
);

const Hook: React.FC<{ src: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 180, mass: .6 } });
  const shake = Math.sin(f * 1.6) * 5;
  return (
    <Paper color={K.yellow}>
      <ComicBurst frame={f} x={748} y={710} color={K.red} scale={.9} />
      <InkLines frame={f} side="left" />
      <div style={{ position: 'absolute', left: 68, top: 180, fontSize: 38, fontWeight: 950, letterSpacing: 5 }}>MINI PROJETOR</div>
      <div style={{ position: 'absolute', left: 58, top: 300, transform: 'translateY(' + interpolate(pop, [0, 1], [100, 0]) + 'px) scale(' + pop + ') rotate(' + shake + 'deg)' }}>
        <Word size={220} color={K.ink}>DIZ</Word>
        <Word size={330} color={K.red} italic rotate={-7} style={{ marginTop: -2 }}>4K?!</Word>
      </div>
      <div style={{ position: 'absolute', right: 62, top: 210, width: 370, height: 90, border: '7px solid ' + K.ink, background: K.white, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'rotate(5deg)', boxShadow: '10px 11px 0 ' + K.ink }}>
        <Word size={58}>HY300</Word>
      </div>
      <ProductSticker src={src} frame={f} x={770} y={1120} width={590} height={590} rotation={-7} revealAt={4} />
      <ProjectorMascot frame={f} x={250} y={1300} scale={.86} energy={1.4} />
      <div style={{ position: 'absolute', left: 70, bottom: 170, padding: '18px 24px', background: K.blue, border: '6px solid ' + K.ink, color: K.white, transform: 'rotate(-4deg)', boxShadow: '8px 9px 0 ' + K.ink, fontSize: 38, fontWeight: 1000 }}>MAS TEM PEGADINHA...</div>
      <HandArrow frame={f} color={K.ink} rotate={-3} />
    </Paper>
  );
};

const Rotate: React.FC<{ src: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 12, stiffness: 130 } });
  const orbit = interpolate(f, [0, 48], [-42, 35]);
  return (
    <Paper color={K.paper}>
      <div style={{ position: 'absolute', left: 68, top: 170 }}>
        <Word size={104}>JOGA A</Word>
        <Word size={172} color={K.red} italic rotate={-5}>IMAGEM</Word>
        <Word size={100}>PRA ONDE</Word>
        <Word size={118} color={K.blue}>QUISER</Word>
      </div>
      <ProductSticker src={src} frame={f} x={580} y={1060} width={760} height={760} rotation={orbit} revealAt={5} />
      <div style={{ position: 'absolute', left: 115, top: 900, transform: 'rotate(-10deg) scale(' + p + ')', border: '9px solid ' + K.ink, background: K.yellow, padding: '20px 30px', boxShadow: '10px 12px 0 ' + K.ink }}>
        <Word size={186} color={K.red}>180°</Word>
      </div>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d="M100 1240 C65 1000 220 760 470 800 C685 830 755 1030 700 1200" fill="none" stroke={K.blue} strokeWidth="17" strokeDasharray="24 16" strokeLinecap="round" strokeDashoffset={interpolate(f, [0, 50], [300, 0])} />
        <path d="M670 1155 L724 1215 L755 1125" stroke={K.blue} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <ProjectorMascot frame={f} x={850} y={350} scale={.55} energy={1.25} />
      <div style={{ position: 'absolute', left: 72, bottom: 160, width: 850, color: K.ink, fontSize: 36, fontWeight: 850, lineHeight: 1.15 }}>SUPORTE ARTICULADO PARA PROJETAR NA PAREDE OU NO TETO.</div>
    </Paper>
  );
};

const IconBadge: React.FC<{ label: string; type: 'android' | 'wifi' | 'bluetooth' | 'hdmi'; x: number; y: number; frame: number; color: string; delay: number }> = ({ label, type, x, y, frame, color, delay }) => {
  const local = Math.max(0, frame - delay);
  const p = spring({ frame: local, fps: 30, config: { damping: 10, stiffness: 180, mass: .55 } });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 420, height: 180, display: 'flex', alignItems: 'center', gap: 22, padding: '18px 24px', background: K.white, border: '7px solid ' + K.ink, boxShadow: '8px 9px 0 ' + K.ink, transform: 'translateX(' + interpolate(p, [0, 1], [300, 0]) + 'px) rotate(' + interpolate(p, [0, 1], [7, -2]) + 'deg)', opacity: interpolate(local, [0, 5], [0, 1], clamp) }}>
      <div style={{ width: 112, height: 112, borderRadius: type === 'android' ? 22 : 999, background: color, display: 'grid', placeItems: 'center', border: '5px solid ' + K.ink }}>
        {type === 'android' && <svg viewBox="0 0 100 100" width="86" height="86"><path d="M22 34 Q50 4 78 34 L74 78 Q50 96 26 78Z" fill={K.white} stroke={K.ink} strokeWidth="6"/><path d="M34 23 L26 10 M66 23 L74 10" stroke={K.ink} strokeWidth="6" strokeLinecap="round"/><circle cx="39" cy="48" r="5" fill={K.ink}/><circle cx="61" cy="48" r="5" fill={K.ink}/></svg>}
        {type === 'wifi' && <svg viewBox="0 0 100 100" width="86" height="86" fill="none" stroke={K.white} strokeWidth="9" strokeLinecap="round"><path d="M10 36 Q50 2 90 36 M24 52 Q50 30 76 52 M38 69 Q50 58 62 69"/><circle cx="50" cy="84" r="6" fill={K.white} stroke="none"/></svg>}
        {type === 'bluetooth' && <svg viewBox="0 0 100 100" width="78" height="78" fill="none" stroke={K.white} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"><path d="M44 10 L76 35 L28 70 M44 90 L76 65 L28 30 M44 10 L44 90"/></svg>}
        {type === 'hdmi' && <svg viewBox="0 0 100 100" width="82" height="82" fill="none" stroke={K.white} strokeWidth="8" strokeLinejoin="round"><path d="M26 18 L74 18 L86 36 L86 70 L74 83 L26 83 L14 70 L14 36Z"/><path d="M31 37 L69 37 M31 53 L69 53 M38 83 L38 93 M62 83 L62 93"/></svg>}
      </div>
      <div style={{ fontSize: 34, fontWeight: 1000, lineHeight: .95, letterSpacing: -1 }}>{label}</div>
    </div>
  );
};

const Smart: React.FC<{ src: string }> = ({ src }) => {
  const f = useCurrentFrame();
  return (
    <Paper color={K.lime}>
      <InkLines frame={f} color={K.ink} side="right" />
      <div style={{ position: 'absolute', left: 70, top: 145, transform: 'rotate(-5deg)' }}>
        <Word size={142}>POR DENTRO</Word>
        <Word size={110} color={K.red} italic>É SMART</Word>
      </div>
      <ProductSticker src={src} frame={f} x={295} y={1110} width={510} height={510} rotation={7} revealAt={3} />
      <IconBadge label="ANDROID 11" type="android" x={590} y={500} frame={f} delay={4} color={K.red} />
      <IconBadge label="WI-FI" type="wifi" x={590} y={715} frame={f} delay={11} color={K.blue} />
      <IconBadge label="BLUETOOTH" type="bluetooth" x={590} y={930} frame={f} delay={18} color={K.red} />
      <IconBadge label="HDMI" type="hdmi" x={590} y={1145} frame={f} delay={25} color={K.blue} />
      <div style={{ position: 'absolute', left: 75, bottom: 180, padding: '18px 24px', border: '7px solid ' + K.ink, background: K.white, fontSize: 32, fontWeight: 950, transform: 'rotate(-4deg)', boxShadow: '8px 9px 0 ' + K.ink }}>APARELHOS COMPATÍVEIS</div>
    </Paper>
  );
};

const Truth: React.FC = () => {
  const f = useCurrentFrame();
  const p = spring({ frame: f, fps: 30, config: { damping: 8, stiffness: 180, mass: .55 } });
  const x = interpolate(p, [0, 1], [-650, 0]);
  const crack = interpolate(f, [8, 23], [0, 1], clamp);
  return (
    <Paper color={K.ink}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#121212 0%,#232323 100%)' }} />
      <div style={{ position: 'absolute', left: 62, top: 170, color: K.white, fontSize: 44, fontWeight: 950, letterSpacing: 5 }}>A VERDADE SOBRE O</div>
      <div style={{ position: 'absolute', left: 54, top: 310, transform: 'rotate(-7deg) translateX(' + x + 'px)' }}>
        <Word size={390} color={K.white} italic>4K</Word>
      </div>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d="M80 290 L900 760 M900 250 L100 800" stroke={K.red} strokeWidth="42" strokeLinecap="round" opacity={crack} strokeDasharray="1250" strokeDashoffset={interpolate(f, [10, 30], [1250, 0], clamp)} />
      </svg>
      <div style={{ position: 'absolute', left: 55, top: 845, width: 970, height: 330, background: K.lime, border: '10px solid ' + K.white, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'rotate(2deg) scale(' + interpolate(p, [0, 1], [.75, 1]) + ')', boxShadow: '14px 17px 0 ' + K.red }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 1000, letterSpacing: 3 }}>RESOLUÇÃO NATIVA</div>
          <Word size={142} color={K.ink}>1024 × 768</Word>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 80, bottom: 225, transform: 'rotate(-5deg) scale(' + p + ')', padding: '18px 26px', background: K.red, border: '8px solid ' + K.white, color: K.white, fontSize: 46, fontWeight: 1000, boxShadow: '9px 10px 0 ' + K.white }}>NÃO É 4K NATIVO.</div>
      <div style={{ position: 'absolute', right: 55, bottom: 120, color: K.white, fontSize: 25, fontWeight: 750, maxWidth: 800, textAlign: 'right' }}>ACEITAR UM SINAL 4K NÃO SIGNIFICA PROJETAR EM 4K.</div>
    </Paper>
  );
};

const Room: React.FC<{ src: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f, fps: 30, config: { damping: 12, stiffness: 120 } });
  return (
    <Paper color={K.paper}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: 'linear-gradient(180deg,rgba(255,255,255,.0),rgba(59,49,36,.12))' }} />
      <div style={{ position: 'absolute', left: 62, top: 160 }}>
        <Word size={130}>NO ESCURO</Word>
        <Word size={105} color={K.red} italic rotate={-4}>FAZ MAIS</Word>
        <Word size={130}>SENTIDO</Word>
      </div>
      <div style={{ position: 'absolute', left: 85, top: 710, width: 910, height: 570, background: '#342D40', border: '13px solid ' + K.ink, borderRadius: 7, transform: 'rotate(-2deg) scale(' + p + ')', boxShadow: '18px 20px 0 rgba(20,20,20,.2)' }}>
        <div style={{ position: 'absolute', inset: 26, background: 'linear-gradient(135deg,#2D3E58,#9687A4 55%,#E7C7A2)', border: '6px solid ' + K.white, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '6%', top: '12%', width: '86%', height: '72%', background: 'linear-gradient(135deg,#F5EAC9,#B9C7D8)', clipPath: 'polygon(10% 0,100% 0,88% 100%,0 100%)' }} />
          <div style={{ position: 'absolute', left: '15%', top: '30%', width: '70%', height: '50%', background: 'linear-gradient(140deg,#D7E8E2,#F8EFCF 55%,#F1B67F)', borderRadius: '50% 50% 0 0' }} />
          <div style={{ position: 'absolute', left: '43%', top: '40%', width: '20%', height: '40%', background: K.red, borderRadius: '50% 50% 0 0' }} />
        </div>
      </div>
      <ProductSticker src={src} frame={f} x={250} y={1430} width={420} height={420} rotation={-8} revealAt={12} />
      <div style={{ position: 'absolute', right: 70, bottom: 330, width: 370, padding: '23px 25px', background: K.yellow, border: '7px solid ' + K.ink, transform: 'rotate(5deg)', boxShadow: '8px 9px 0 ' + K.ink }}>
        <Word size={55}>USO CASUAL</Word>
        <div style={{ marginTop: 15, fontSize: 27, fontWeight: 800, lineHeight: 1.1 }}>O som pode pedir uma caixa Bluetooth.</div>
      </div>
      <ProjectorMascot frame={f} x={795} y={1570} scale={.52} energy={1.2} />
    </Paper>
  );
};

const Verdict: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 9, stiffness: 150, mass: .6 } });
  const bounce = Math.sin(f * .42) * 18;
  return (
    <Paper color={K.yellow}>
      <ComicBurst frame={f} x={540} y={760} color={K.red} scale={1.06} />
      <div style={{ position: 'absolute', left: 60, top: 150 }}>
        <Word size={132}>PRATICIDADE?</Word>
        <Word size={160} color={K.blue} italic rotate={-5}>SIM.</Word>
      </div>
      <div style={{ position: 'absolute', right: 70, top: 650, transform: 'rotate(4deg) scale(' + p + ')', background: K.ink, color: K.white, border: '7px solid ' + K.white, padding: '26px 30px', boxShadow: '10px 11px 0 ' + K.red }}>
        <Word size={83} color={K.white}>CINEMA 4K?</Word>
        <Word size={140} color={K.lime} italic>NÃO.</Word>
      </div>
      <ProjectorMascot frame={f} x={330} y={1160 + bounce} scale={1.05} energy={1.4} />
      <div style={{ position: 'absolute', left: 76, right: 76, bottom: 205, padding: '27px 25px', background: K.white, border: '9px solid ' + K.ink, transform: 'rotate(-2deg)', boxShadow: '10px 12px 0 ' + K.ink, textAlign: 'center' }}>
        <Word size={80} italic>VOCÊ COMPRARIA?</Word>
      </div>
      <div style={{ position: 'absolute', left: 80, top: 1520, fontSize: 30, fontWeight: 950 }}>HY300 • VETOR.BLOG</div>
    </Paper>
  );
};

const SceneRenderer: React.FC<{ scene: ComicScene; src: string }> = ({ scene, src }) => {
  switch (scene.kind) {
    case 'hook': return <Hook src={src} />;
    case 'rotate': return <Rotate src={src} />;
    case 'smart': return <Smart src={src} />;
    case 'truth': return <Truth />;
    case 'room': return <Room src={src} />;
    case 'verdict': return <Verdict />;
    default: return null;
  }
};

export const HY300ComicShort: React.FC<HY300ComicShortProps> = (props) => {
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <Audio src={resolveMediaSource(props.audioUrl)} volume={1} />
      {props.musicUrl ? <Audio src={resolveMediaSource(props.musicUrl)} volume={0.12} loop /> : null}
      {props.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)} premountFor={6}>
          <SceneRenderer scene={scene} src={props.imageUrl} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
