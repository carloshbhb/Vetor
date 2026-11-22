import React from 'react';
import {
  AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import { SceneCreativeTreatment, type SceneCreativeDirection } from './SceneCreativeTreatment';
import { planVetorSceneMixes } from '../../scripts/visual-sequence-planner.mjs';

type PilotScene = {
  id: number;
  text: string;
  title: string;
  visualCue: string;
  visualIntent: string;
  visualTemplates: string[];
  duration: number;
  accent: string;
  transitionIn: string;
  imageLabel: string;
  motif: 'hero' | 'macro' | 'layers' | 'hud' | 'lifestyle' | 'data' | 'arena' | 'editorial';
};

const SCENES: PilotScene[] = [
  {
    id: 1, title: 'A PRIMEIRA IMPRESSÃO CONTA', visualCue: 'Hook de impacto',
    text: 'Esse tablet combina com a sua rotina? Antes da ficha técnica, a apresentação precisa conquistar o olhar.',
    visualIntent: 'Palavra-chave em impacto, tablet revelado em 3D gráfico, câmera avança rapidamente com wipe cinematográfico.',
    visualTemplates: ['kinetic-typography', 'premium-product-3d', 'cinematic-2d'],
    duration: 6, accent: '#FF49A6', transitionIn: 'cinematic-wipe', imageLabel: 'HERO REVEAL', motif: 'hero',
  },
  {
    id: 2, title: 'OLHE PARA OS DETALHES', visualCue: 'Acabamento externo',
    text: 'O close aproxima o produto. Luz de recorte e macro ajudam a destacar o acabamento, sem esconder o que importa.',
    visualIntent: 'Close macro do detalhe externo com luz de recorte, câmera faz pan lento e HUD discreto identifica apenas elementos visíveis.',
    visualTemplates: ['premium-product-3d', 'editorial-luxury', 'hologram-hud'],
    duration: 6, accent: '#D6B269', transitionIn: 'soft-cut', imageLabel: 'MACRO / DETAIL', motif: 'macro',
  },
  {
    id: 3, title: 'CAMADAS EXPLICAM A IDEIA', visualCue: 'Camadas visuais ilustrativas',
    text: 'As camadas da apresentação se separam para explicar a experiência visual. Esta animação é ilustrativa, não representa peças internas do aparelho.',
    visualIntent: 'Painéis gráficos e camadas de interface se afastam em profundidade, conectores isométricos entram e câmera orbita lentamente; não mostrar componentes internos reais.',
    visualTemplates: ['exploded-teardown', 'isometric-explainer', 'cinematic-2d'],
    duration: 6, accent: '#38D2DC', transitionIn: 'component-snap', imageLabel: 'ILLUSTRATIVE LAYERS', motif: 'layers',
  },
  {
    id: 4, title: 'DADOS PRECISAM DE CONTEXTO', visualCue: 'Especificações e critérios',
    text: 'Uma ficha técnica ganha força quando cada característica aparece ligada a uma pergunta real de compra.',
    visualIntent: 'Painéis HUD aparecem ao redor do produto, critérios viram indicadores animados sem inventar números e câmera faz push-in controlado.',
    visualTemplates: ['hologram-hud', 'data-storytelling', 'premium-product-3d'],
    duration: 6, accent: '#5AFFE1', transitionIn: 'scan-reveal', imageLabel: 'SPEC → BENEFIT', motif: 'hud',
  },
  {
    id: 5, title: 'MOSTRE A ROTINA', visualCue: 'Estudo, streaming e trabalho',
    text: 'O contexto de uso muda a história. Um bom vídeo traduz estudo, entretenimento e trabalho em cenas fáceis de reconhecer.',
    visualIntent: 'Cenários vetoriais ilustrativos entram por match cuts, camadas 2D criam parallax e a câmera desliza lateralmente.',
    visualTemplates: ['lifestyle-demo', 'cinematic-2d', 'isometric-explainer'],
    duration: 6, accent: '#FFC275', transitionIn: 'match-cut', imageLabel: 'EVERYDAY CONTEXT', motif: 'lifestyle',
  },
  {
    id: 6, title: 'NÃO ESCONDA AS RESSALVAS', visualCue: 'Ponto de atenção',
    text: 'Credibilidade também é mostrar limites, compatibilidade e o que precisa ser conferido na versão exata do anúncio.',
    visualIntent: 'Palavras-chave surgem em tipografia cinética, cartões de ressalva entram em camadas e a câmera faz aproximação curta.',
    visualTemplates: ['kinetic-typography', 'editorial-luxury', 'cinematic-2d'],
    duration: 6, accent: '#FF975E', transitionIn: 'word-swipe', imageLabel: 'TRADE-OFF / CLARITY', motif: 'editorial',
  },
  {
    id: 7, title: 'COMPARE CRITÉRIOS, NÃO GRITE VENCEDORES', visualCue: 'Comparação de critérios',
    text: 'A comparação fica mais útil quando coloca os critérios lado a lado e deixa a escolha depender do perfil de cada pessoa.',
    visualIntent: 'Tela dividida em arena, cartões de critérios surgem em sequência, gráfico comparativo sem pontuação inventada e corte de impacto.',
    visualTemplates: ['comparison-arena', 'data-storytelling', 'kinetic-typography'],
    duration: 6, accent: '#FF6868', transitionIn: 'arena-slam', imageLabel: 'SIDE BY SIDE', motif: 'arena',
  },
  {
    id: 8, title: 'UM VEREDITO LIMPO E DIRETO', visualCue: 'Veredito editorial',
    text: 'No fim, um veredito objetivo conecta os pontos fortes, as ressalvas e o tipo de uso que faz sentido.',
    visualIntent: 'Hero shot editorial com espaço negativo, luz de recorte, movimento orbital lento e headline final entra com precisão.',
    visualTemplates: ['editorial-luxury', 'premium-product-3d', 'kinetic-typography'],
    duration: 6, accent: '#D8D0B8', transitionIn: 'soft-cut', imageLabel: 'FINAL VERDICT', motif: 'editorial',
  },
];

const DIRECTIONS = planVetorSceneMixes({
  scenes: SCENES,
  title: 'Xiaomi Redmi Pad 2 Pro',
  category: 'Tablets',
  hasProductGallery: true,
  hasBroll: true,
}) as SceneCreativeDirection[];

const INK = '#080C14';
const PAPER = '#F7FAFF';

const Device: React.FC<{ accent: string; scale?: number; x?: number; y?: number; rotate?: number }> = ({
  accent, scale = 1, x = 0, y = 0, rotate = -7,
}) => (
  <div style={{
    position: 'absolute', width: 620, height: 430, left: '50%', top: '50%',
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) rotate(${rotate}deg) perspective(1200px) rotateY(-13deg)`,
    filter: 'drop-shadow(0 42px 52px rgba(0,0,0,.62))',
  }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 38, background: 'linear-gradient(135deg,#D5D9E0,#48515E 48%,#141C28)', border: '3px solid #D9E0EA' }} />
    <div style={{ position: 'absolute', inset: 15, borderRadius: 27, overflow: 'hidden', background: 'linear-gradient(135deg,#101C35,#050A15 60%,#1A2D54)' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 25%, ${accent}88, transparent 42%), linear-gradient(145deg,transparent 34%,#4285F4 35%,#1428A0 68%,#080C14 69%)` }} />
      <div style={{ position: 'absolute', left: 52, top: 46, width: 210, height: 5, borderRadius: 8, background: '#FFFFFF88' }} />
      <div style={{ position: 'absolute', left: 52, top: 66, width: 138, height: 4, borderRadius: 8, background: '#FFFFFF44' }} />
      <div style={{ position: 'absolute', right: 48, bottom: 42, width: 96, height: 96, border: `2px solid ${accent}88`, borderRadius: 20, transform: 'rotate(18deg)' }} />
    </div>
    <div style={{ position: 'absolute', right: 28, top: 17, width: 7, height: 7, borderRadius: 10, background: '#0B1020' }} />
  </div>
);

const Motif: React.FC<{ scene: PilotScene; frame: number }> = ({ scene, frame }) => {
  const pulse = 1 + Math.sin(frame / 10) * 0.025;
  if (scene.motif === 'hero') return (
    <>
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: 800, border: `1px solid ${scene.accent}66`, transform: `scale(${0.78 + frame / 1800})`, boxShadow: `0 0 110px ${scene.accent}22` }} />
      <Device accent={scene.accent} scale={pulse * 0.96} />
    </>
  );
  if (scene.motif === 'macro') return (
    <>
      <div style={{ position: 'absolute', width: 880, height: 620, borderRadius: 44, border: `1px solid ${scene.accent}66`, transform: 'rotate(-9deg)', boxShadow: `0 0 90px ${scene.accent}20` }} />
      <Device accent={scene.accent} scale={1.12 + frame / 9000} x={-30} rotate={-3} />
      <div style={{ position: 'absolute', left: 110, top: 300, width: 320, height: 2, background: scene.accent, boxShadow: `0 0 24px ${scene.accent}` }} />
    </>
  );
  if (scene.motif === 'layers') return (
    <>
      <Device accent={scene.accent} scale={0.84} />
      {[0, 1, 2].map((index) => (
        <div key={index} style={{
          position: 'absolute', width: 520 - index * 65, height: 320 - index * 38,
          border: `2px solid ${scene.accent}`, borderRadius: 26,
          background: `${scene.accent}${index === 0 ? '15' : '08'}`,
          transform: `translate(${(index - 1) * 68}px, ${-180 - index * 48 + Math.sin(frame / 15 + index) * 7}px) rotate(${(index - 1) * -7}deg)`,
          boxShadow: `0 18px 42px rgba(0,0,0,.25), 0 0 25px ${scene.accent}20`,
        }}>
          <div style={{ position: 'absolute', left: 20, top: 18, fontSize: 15, letterSpacing: 3, color: scene.accent }}>LAYER 0{index + 1}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', top: 160, fontSize: 18, letterSpacing: 5, color: scene.accent }}>CAMADAS GRÁFICAS • ILUSTRAÇÃO</div>
    </>
  );
  if (scene.motif === 'hud') return (
    <>
      <Device accent={scene.accent} scale={0.78} />
      <div style={{ position: 'absolute', width: 850, height: 700, border: `1px solid ${scene.accent}77`, clipPath: 'polygon(0 0,92% 0,100% 12%,100% 100%,8% 100%,0 88%)', boxShadow: `inset 0 0 48px ${scene.accent}18` }} />
      {[0, 1, 2].map((index) => <div key={index} style={{ position: 'absolute', left: 70 + index * 300, top: 255 + (index % 2) * 780, width: 235, height: 2, background: scene.accent, opacity: 0.75 }} />)}
    </>
  );
  if (scene.motif === 'lifestyle') return (
    <>
      <div style={{ position: 'absolute', bottom: 255, width: 870, height: 260, borderRadius: 34, background: 'linear-gradient(90deg,#313E52,#111A2B)', borderBottom: '18px solid #060A11' }} />
      <Device accent={scene.accent} scale={0.75} rotate={-3} y={-115} />
      <div style={{ position: 'absolute', top: 270, display: 'flex', gap: 22 }}>
        {['ESTUDO', 'STREAMING', 'TRABALHO'].map((item, index) => <div key={item} style={{ padding: '15px 20px', border: `1px solid ${scene.accent}88`, borderRadius: 16, color: PAPER, background: '#08111DD9', fontSize: 19, letterSpacing: 2 }}>{item}</div>)}
      </div>
    </>
  );
  if (scene.motif === 'data') return (
    <>
      <Device accent={scene.accent} scale={0.55} x={-160} />
      <div style={{ position: 'absolute', right: 105, bottom: 300, display: 'flex', alignItems: 'end', gap: 20, height: 430 }}>
        {[0.45, 0.8, 0.62, 1].map((value, index) => <div key={index} style={{ width: 92, height: value * 390 * interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' }), background: `linear-gradient(0deg,${scene.accent}55,${scene.accent})`, borderRadius: '12px 12px 0 0', boxShadow: `0 0 22px ${scene.accent}22` }} />)}
      </div>
      <div style={{ position: 'absolute', bottom: 250, fontSize: 18, letterSpacing: 4, color: PAPER }}>CRITÉRIOS • CONTEXTO • ESCOLHA</div>
    </>
  );
  if (scene.motif === 'arena') return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: `${scene.accent}18`, borderRight: `2px solid ${scene.accent}` }} />
      <Device accent={scene.accent} scale={0.65} />
      <div style={{ position: 'absolute', top: 300, left: 115, color: PAPER, fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>CRITÉRIO A</div>
      <div style={{ position: 'absolute', top: 300, right: 115, color: scene.accent, fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>CRITÉRIO B</div>
      <div style={{ position: 'absolute', bottom: 270, color: PAPER, fontSize: 22, letterSpacing: 3 }}>SEM VENCEDOR INVENTADO</div>
    </>
  );
  return (
    <>
      <Device accent={scene.accent} scale={1.02} rotate={-2} />
      <div style={{ position: 'absolute', top: 250, width: 760, height: 1, background: scene.accent }} />
      <div style={{ position: 'absolute', bottom: 270, fontSize: 22, letterSpacing: 7, color: scene.accent }}>VETOR • EDITORIAL FINISH</div>
    </>
  );
};

const PilotSceneView: React.FC<{ scene: PilotScene; plan: SceneCreativeDirection; index: number }> = ({ scene, plan, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 125, mass: 0.72 } });
  const opacity = interpolate(frame, [0, 10, 160, 180], [0, 1, 1, 0.88], { extrapolateRight: 'clamp' });
  const y = interpolate(enter, [0, 1], [70, 0]);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 42%,#172B49 0%,#0F1623 48%,#080C14 100%)', color: PAPER, alignItems: 'center', justifyContent: 'center', opacity }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%,${scene.accent}1A,transparent 60%)` }} />
      <div style={{ position: 'absolute', top: 132, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 19, letterSpacing: 5, color: scene.accent, fontWeight: 900 }}>VETOR • MIXED MOTION</div>
        <div style={{ fontSize: 18, letterSpacing: 3, color: '#AEB8C8' }}>CENA {String(index + 1).padStart(2, '0')} / 08</div>
      </div>
      <div style={{ position: 'absolute', top: 245, left: 70, right: 70, textAlign: 'center', transform: `translateY(${y}px)` }}>
        <div style={{ color: scene.accent, fontSize: 23, fontWeight: 900, letterSpacing: 4 }}>{plan.templateNames.join(' + ').toUpperCase()}</div>
        <div style={{ marginTop: 22, fontSize: 49, lineHeight: 1.02, letterSpacing: -1.8, fontWeight: 950 }}>{scene.title}</div>
      </div>
      <div style={{ position: 'absolute', top: 625, left: 0, right: 0, bottom: 360 }}>
        <Motif scene={scene} frame={frame} />
      </div>
      <div style={{ position: 'absolute', bottom: 235, left: 74, right: 74, textAlign: 'center', color: '#C7D2E2', fontSize: 21, letterSpacing: 3 }}>{scene.imageLabel}</div>
      <div style={{ position: 'absolute', bottom: 148, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#91A0B5', fontSize: 15, letterSpacing: 4 }}>REVIEW VISUAL • REDMI PAD 2 PRO</div>
        <div style={{ height: 3, width: 210, background: '#FFFFFF24' }}><div style={{ height: '100%', width: `${frame / 180 * 100}%`, background: scene.accent }} /></div>
      </div>
      <SceneCreativeTreatment
        plan={plan}
        accent={scene.accent}
        label={scene.title}
        sceneText={scene.text}
        metric={null}
      />
    </AbsoluteFill>
  );
};

export const MixedCreativePilot: React.FC<{ audioUrl: string }> = ({ audioUrl }) => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Audio src={staticFile(audioUrl)} volume={1} />
    {SCENES.map((scene, index) => (
      <Sequence key={scene.id} from={index * 180} durationInFrames={180}>
        <PilotSceneView scene={scene} plan={DIRECTIONS[index]} index={index} />
      </Sequence>
    ))}
    <Sequence from={1440} durationInFrames={360}>
      <AbsoluteFill style={{ background: 'linear-gradient(145deg,#1428A0,#080C14)', alignItems: 'center', justifyContent: 'center', color: PAPER }}>
        <div style={{ fontSize: 26, letterSpacing: 8, color: '#70C4FF' }}>VETOR • MOTION LAB</div>
        <div style={{ marginTop: 34, fontSize: 68, lineHeight: 1.05, fontWeight: 950, textAlign: 'center' }}>UM PRODUTO.<br/>VÁRIAS LINGUAGENS.<br/>UMA HISTÓRIA COESA.</div>
        <div style={{ marginTop: 48, color: '#C7D2E2', fontSize: 23, letterSpacing: 2 }}>IA DIRIGE CADA CENA • REMOTION EXECUTA</div>
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
