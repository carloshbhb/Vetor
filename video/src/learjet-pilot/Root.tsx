import React from 'react';
import {
  AbsoluteFill, Audio, Composition, Sequence, interpolate, registerRoot,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

const FPS = 30;
const DURATION = 75 * FPS;
const C = { bg: '#070B12', panel: '#111B2A', blue: '#6CA8FF', cyan: '#70E0E5', white: '#F4F7FB', muted: '#A8B5C7', red: '#F06B62', gold: '#F0C779' };

type Scene = { start: number; end: number; kicker: string; title: string; body: string; kind: 'hook'|'map'|'timeline'|'recorder'|'close' };
const scenes: Scene[] = [
  { start: 0, end: 270, kicker: 'ACIDENTE AÉREO • FLÓRIDA', title: 'UM LEARJET\nCAIU PERTO DE CASAS', body: 'Nove pessoas morreram. A investigação ainda procura respostas.', kind: 'hook' },
  { start: 270, end: 570, kicker: 'A ROTA', title: 'TEXAS → BAHAMAS', body: 'O Learjet 60 partiu de Austin com destino a North Eleuthera.', kind: 'map' },
  { start: 570, end: 900, kicker: '1º DE NOVEMBRO DE 2026', title: 'O ALERTA NO VOO', body: 'A tripulação comunicou condições de gelo e turbulência antes da descida de emergência.', kind: 'timeline' },
  { start: 900, end: 1350, kicker: 'GREENACRES • PALM BEACH COUNTY', title: 'O IMPACTO', body: 'A aeronave caiu em uma área residencial próxima a uma via. Nove ocupantes morreram.', kind: 'close' },
  { start: 1350, end: 1800, kicker: 'INVESTIGAÇÃO EM ANDAMENTO', title: 'A PEÇA-CHAVE: O GRAVADOR', body: 'A NTSB recuperou o gravador de voz da cabine e o enviou para análise em Washington.', kind: 'recorder' },
  { start: 1800, end: 2250, kicker: 'O QUE SE SABE — E O QUE NÃO SE SABE', title: 'A CAUSA AINDA NÃO FOI\nDETERMINADA', body: 'Gelo, turbulência e a rápida descida fazem parte da apuração. Nenhum deles, isoladamente, confirma a causa.', kind: 'close' },
];

const fade = (f: number, a: number, b: number) => interpolate(f, [a, a + 18, b - 18, b], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Grid = () => <div style={{ position: 'absolute', inset: 0, opacity: .12, backgroundImage: 'linear-gradient(rgba(108,168,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(108,168,255,.22) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />;

const RouteMap = ({ frame }: { frame: number }) => {
  const p = interpolate(frame, [0, 240], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <svg viewBox="0 0 900 620" style={{ width: '100%', height: 'auto' }}>
    <path d="M120 110 L310 60 L470 100 L580 220 L520 360 L390 420 L260 360 L150 260 Z" fill="#14263A" stroke="#45617D" strokeWidth="3"/>
    <path d="M620 430 Q700 400 780 455 L820 500 L760 525 L690 495 Z" fill="#14263A" stroke="#45617D" strokeWidth="3"/>
    <path d="M210 210 Q380 160 545 300 Q620 360 720 450" fill="none" stroke="#6CA8FF" strokeWidth="5" strokeDasharray="10 13" strokeDashoffset={Math.max(0, 700 - p * 700)} />
    <circle cx="210" cy="210" r="12" fill={C.cyan}/><circle cx="545" cy="300" r="14" fill={C.red}/>
    <circle cx="720" cy="450" r="10" fill={C.gold}/>
    <text x="175" y="180" fill={C.white} fontSize="25" fontWeight="700">AUSTIN</text>
    <text x="485" y="270" fill={C.white} fontSize="23" fontWeight="700">FLÓRIDA</text>
    <text x="690" y="490" fill={C.white} fontSize="22" fontWeight="700">BAHAMAS</text>
    <text x="555" y="345" fill={C.red} fontSize="18" fontWeight="700">LOCAL DA QUEDA</text>
  </svg>;
};

const Radar = ({ frame }: { frame: number }) => {
  const spin = frame * 1.5;
  return <div style={{ width: 430, height: 430, borderRadius: '50%', border: '2px solid rgba(112,224,229,.55)', position: 'relative', margin: '20px auto', background: 'radial-gradient(circle,rgba(25,85,104,.28),rgba(8,17,29,.15) 65%)' }}>
    {[.25,.5,.75].map(v => <div key={v} style={{ position:'absolute', inset:`${v*100/2}%`, border:'1px solid rgba(112,224,229,.24)', borderRadius:'50%' }} />)}
    <div style={{ position:'absolute', left:'50%',top:'50%',width:'48%',height:2,transformOrigin:'left center',transform:`rotate(${spin}deg)`,background:'linear-gradient(90deg,rgba(112,224,229,.8),transparent)' }} />
    <div style={{ position:'absolute',left:'62%',top:'42%',width:13,height:13,borderRadius:'50%',background:C.red,boxShadow:'0 0 22px #F06B62' }} />
  </div>;
};

const SceneVisual = ({ scene, local }: { scene: Scene; local: number }) => {
  if (scene.kind === 'map') return <RouteMap frame={local}/>;
  if (scene.kind === 'timeline') return <Radar frame={local}/>;
  if (scene.kind === 'recorder') return <div style={{ width:380,height:250,margin:'55px auto',border:'2px solid #D18B42',borderRadius:26,background:'linear-gradient(145deg,#3B2418,#17110E)',boxShadow:'0 25px 70px #0009',display:'grid',placeItems:'center' }}>
    <div style={{width:190,height:120,border:'5px solid #E2A04D',borderRadius:18,display:'grid',placeItems:'center',color:'#F7C879',fontSize:30,fontWeight:900,letterSpacing:4}}>CVR</div>
    <div style={{color:'#F7C879',fontSize:16,letterSpacing:4}}>COCKPIT VOICE RECORDER</div>
  </div>;
  if (scene.kind === 'close') return <div style={{margin:'70px auto',width:470,padding:32,border:'1px solid #36516D',borderRadius:24,background:'linear-gradient(145deg,#152438,#0B111B)',textAlign:'center'}}>
    <div style={{fontSize:76,fontWeight:900,color:C.white}}>9</div><div style={{fontSize:23,color:C.muted,letterSpacing:3}}>VÍTIMAS A BORDO</div>
    <div style={{height:2,background:'#38506A',margin:'26px 0'}}/><div style={{fontSize:18,color:C.gold,letterSpacing:2}}>CAUSA NÃO DETERMINADA</div>
  </div>;
  return <div style={{margin:'65px auto',width:470,height:250,display:'grid',placeItems:'center',border:'1px solid #34506B',borderRadius:28,background:'linear-gradient(140deg,#17283C,#0B121C)'}}>
    <div style={{fontSize:22,color:C.cyan,letterSpacing:6,fontWeight:800}}>LEARN • INVESTIGATE</div>
    <div style={{fontSize:80,color:C.white,fontWeight:900}}>NTSB</div>
  </div>;
};

const StoryScene = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const local = frame - scene.start;
  const opacity = fade(frame, scene.start, scene.end);
  const lift = interpolate(local, [0,24], [34,0], { extrapolateLeft:'clamp',extrapolateRight:'clamp' });
  return <AbsoluteFill style={{opacity,padding:'90px 72px 100px',color:C.white,fontFamily:'Arial, sans-serif',justifyContent:'space-between'}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:800,letterSpacing:4,color:C.muted}}><span>VETOR • EXPLICA</span><span>AVIAÇÃO / INVESTIGAÇÃO</span></div>
    <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',transform:`translateY(${lift}px)`}}>
      <div style={{fontSize:19,fontWeight:800,letterSpacing:5,color:C.cyan,marginBottom:24}}>{scene.kicker}</div>
      <div style={{fontSize:scene.kind==='hook'?66:58,lineHeight:1.02,fontWeight:900,letterSpacing:-2,whiteSpace:'pre-line',maxWidth:900}}>{scene.title}</div>
      <div style={{fontSize:27,lineHeight:1.38,color:'#C5D0DE',marginTop:28,maxWidth:850}}>{scene.body}</div>
      <div style={{height:height*.33,display:'grid',placeItems:'center'}}><SceneVisual scene={scene} local={local}/></div>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:16,color:'#8293A8',letterSpacing:2}}><span>FONTES: NTSB • AP</span><span>CAUSA SOB INVESTIGAÇÃO</span></div>
  </AbsoluteFill>;
};

const LearjetPilot = () => {
  const frame = useCurrentFrame();
  const progress = frame / DURATION;
  return <AbsoluteFill style={{background:C.bg,overflow:'hidden'}}>
    <Grid/>
    <div style={{position:'absolute',left:0,right:0,top:0,height:5,background:'#1C2B3E'}}>
      <div style={{height:'100%',width:`${progress*100}%`,background:C.blue}}/>
    </div>
    {scenes.map(scene => <Sequence key={scene.start} from={scene.start} durationInFrames={scene.end-scene.start}><StoryScene scene={scene}/></Sequence>)}
    <Audio src={staticFile('learjet-pilot-voice.mp3')} volume={1}/>
  </AbsoluteFill>;
};

const Root = () => <Composition id="Learjet60DocumentaryPilot" component={LearjetPilot} durationInFrames={DURATION} fps={FPS} width={1080} height={1920}/>;
registerRoot(Root);
