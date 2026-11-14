import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ColorField, CutLetters, HeadlineStrip, Scraps} from '../vendor/vox-paper/collagekit';
import {CrumpledPaper, Grain} from '../vendor/vox-paper/materials';
import {CollageFilters} from '../vendor/vox-paper/filters';
import {ToonObjectCharacter, type ToonObjectCharacterProps} from '../vendor/opus-toon/ToonObjectCharacter';

type Kind='hook'|'rotate'|'features'|'truth'|'room'|'verdict';
export type HY300ReferenceScene={id:number;kind:Kind;startFrame:number;endFrame:number;narration:string;headline:string;kicker:string};
export type HY300ReferenceShortProps={title:string;imageUrl:string;voiceUrl:string;musicUrl:string;effectsUrl:string;scenes:HY300ReferenceScene[];totalDurationFrames:number;fps:number};

const PAL:Record<Kind,{bg:string;paper:string;accent:string;disc:string;ink:string}>={
 hook:{bg:'#F5EC0C',paper:'#F8F1DE',accent:'#D72E27',disc:'#E8D810',ink:'#151515'},
 rotate:{bg:'#2B6A99',paper:'#F7F0E0',accent:'#F4D64E',disc:'#3C80AD',ink:'#151515'},
 features:{bg:'#EB536B',paper:'#F8F1E4',accent:'#F5EC0C',disc:'#C94A61',ink:'#151515'},
 truth:{bg:'#F1E8D7',paper:'#FFFAEF',accent:'#C11314',disc:'#D7C9AF',ink:'#151515'},
 room:{bg:'#1B2550',paper:'#F4E9D5',accent:'#F5EC0C',disc:'#28376F',ink:'#F8F0E0'},
 verdict:{bg:'#C8352B',paper:'#FFF8E8',accent:'#F5EC0C',disc:'#A92823',ink:'#151515'},
};
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};
const stepAt=(f:number)=>Math.floor(f/2)*2;
const media=(p:string)=>staticFile(p.replace(/^\//,''));

const PaperTag:React.FC<{x:number;y:number;text:string;frame:number;start?:number;color?:string;ink?:string;rotate?:number;size?:number}>=
({x,y,text,frame,start=0,color='#F7F0E0',ink='#151515',rotate=-3,size=44})=>{
 const f=Math.max(0,frame-start);
 const p=spring({frame:f,fps:24,config:{damping:11,stiffness:175,mass:.62}});
 return <div style={{position:'absolute',left:x+'%',top:y+'%',padding:'13px 18px 15px',background:color,border:'3px solid #171717',boxShadow:'9px 11px 0 rgba(20,20,20,.3)',clipPath:'polygon(1% 4%,98% 0,100% 95%,3% 100%,0 65%)',transform:`translateY(${interpolate(p,[0,1],[75,0],clamp)}px) rotate(${interpolate(p,[0,1],[rotate-13,rotate])}deg) scale(${interpolate(p,[0,1],[.72,1],clamp)})`,opacity:interpolate(f,[0,3],[0,1],clamp),color:ink,fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:size,fontWeight:900,lineHeight:1,whiteSpace:'nowrap'}}>{text}</div>;
};

const ProductPrint:React.FC<{imageUrl:string;frame:number;x:number;y:number;width:number;rotation?:number;start?:number;swing?:boolean}>=
({imageUrl,frame,x,y,width,rotation=-5,start=0,swing=false})=>{
 const f=Math.max(0,frame-start);
 const p=spring({frame:f,fps:24,config:{damping:10,stiffness:150,mass:.7}});\n const yaw=swing?interpolate(frame,[start+4,start+20,start+38,start+54],[0,-24,18,0],clamp):0;
 return <div style={{position:'absolute',left:x+'%',top:y+'%',width,padding:'18px 18px 58px',background:'#FBF7EA',border:'3px solid #171717',boxShadow:'15px 20px 0 rgba(0,0,0,.32)',clipPath:'polygon(1% 1%,99% 0,100% 98%,96% 100%,2% 99%,0 3%)',transform:`perspective(1200px) translateY(${interpolate(p,[0,1],[100,0],clamp)}px) rotateY(${yaw}deg) rotate(${rotation+(1-p)*12}deg) scale(${interpolate(p,[0,1],[.55,1],clamp)})`,opacity:interpolate(f,[0,5],[0,1],clamp),transformOrigin:'50% 55%'}}>
  <div style={{position:'relative',width:'100%',aspectRatio:'1/1',overflow:'hidden',background:'#E5DED1'}}>
   <Img src={media(imageUrl)} style={{width:'100%',height:'100%',objectFit:'cover',filter:'grayscale(.72) contrast(1.12) sepia(.12)'}}/>
   <AbsoluteFill style={{pointerEvents:'none',opacity:.22,mixBlendMode:'multiply',backgroundImage:'radial-gradient(#171717 .7px,transparent .9px)',backgroundSize:'7px 7px'}}/>
  </div>
  <div style={{position:'absolute',left:24,bottom:12,fontFamily:'Courier New,monospace',fontSize:23,fontWeight:700,color:'#28231D',letterSpacing:1}}>HY300 / FOTO DA OFERTA</div>
 </div>;
};

const MarkerScribble:React.FC<{frame:number;start:number;x:number;y:number;width:number;color?:string;rotate?:number}>=
({frame,start,x,y,width,color='#C11314',rotate=-4})=>{
 const p=interpolate(frame,[start,start+11],[0,1],clamp);
 return <svg viewBox="0 0 500 130" width={width} height={width*.26} style={{position:'absolute',left:x+'%',top:y+'%',overflow:'visible',transform:`rotate(${rotate}deg)`}}>
  <path d="M18 86 Q110 12 190 75 T355 56 Q415 33 486 68" fill="none" stroke={color} strokeWidth="23" strokeLinecap="round" strokeDasharray="520" strokeDashoffset={520*(1-p)}/>
  <path d="M22 96 Q115 31 196 87 T358 69 Q429 47 490 79" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray="520" strokeDashoffset={520*(1-p)} opacity=".78"/>
 </svg>;
};

const CameraBoard:React.FC<{frame:number;children:React.ReactNode;amount?:number}>=({frame,children,amount=1})=>{
 const x=Math.sin(frame*.018)*10*amount,y=Math.cos(frame*.015)*8*amount;
 const scale=1.025+interpolate(frame,[0,90],[0,.025],clamp)*amount;
 return <AbsoluteFill style={{transform:`translate(${x}px,${y}px) scale(${scale})`,transformOrigin:'50% 50%'}}>{children}</AbsoluteFill>;
};

const BeatScene:React.FC<{scene:HY300ReferenceScene;imageUrl:string}>=({scene,imageUrl})=>{
 const frame=useCurrentFrame(),step=stepAt(frame),p=PAL[scene.kind];
 const scraps=[
  {kind:'zigzag' as const,x:6,y:29,size:8,color:p.accent,rot:-14},
  {kind:'triangle' as const,x:86,y:20,size:5,color:p.paper,rot:22},
  {kind:'dot' as const,x:7,y:73,size:4,color:p.paper},
  {kind:'star' as const,x:87,y:68,size:6,color:p.accent,rot:8},
 ];
 return <AbsoluteFill style={{overflow:'hidden',background:p.bg,color:p.ink}}>
  <CameraBoard frame={frame} amount={scene.kind==='truth'?.35:1}>
   <ColorField color={p.bg} dots={scene.kind==='room'?'tl':'br'} disc={{x:scene.kind==='truth'?72:52,y:48,r:scene.kind==='truth'?24:33,color:p.disc}} seed={scene.id+5}/>
   <CrumpledPaper color={p.paper} seed={scene.id*13} strength={.29} style={{opacity:.3,mixBlendMode:'multiply'}}/>
   {scene.kind==='hook'&&<>
    <div style={{position:'absolute',left:'7%',top:'7%',fontFamily:'Bebas Neue,Impact,sans-serif',fontWeight:900,fontSize:48,letterSpacing:3}}>UM MINI PROJETOR...</div>
    <CutLetters text="4K?!" step={step} sizePctH={12} x={7} y={13} seed="hy300-hook" perChar={1} styles={[{bg:'#171717',fg:'#F5EC0C',font:'Bebas Neue,Impact,sans-serif'},{bg:'#F7F0E0',fg:'#171717',font:'Bebas Neue,Impact,sans-serif'}]} rotRange={6}/>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={31} y={34} width={590} rotation={-6} start={4}/>
    <HeadlineStrip text="MAS A FICHA TEM UM DETALHE" step={Math.max(0,Math.floor((frame-22)/2))} sizePctH={3.1} x={7} y={76} bg="#171717" fg="#F8F0E0" rot={2} font="Arial Black"/>
    <MarkerScribble frame={frame} start={26} x={57} y={29} width={330} rotate={8}/>
   </>}
   {scene.kind==='rotate'&&<>
    <HeadlineStrip text="ELE GIRA 180°" step={Math.max(0,Math.floor((frame-1)/2))} sizePctH={6.3} x={8} y={9} bg="#F5EC0C" fg="#171717" rot={-3}/>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={25} y={28} width={650} rotation={7} start={4} swing/>
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
     <path d="M190 1250 C65 950 270 670 540 720 C800 768 890 1050 755 1270" fill="none" stroke="#F5EC0C" strokeWidth="17" strokeLinecap="round" strokeDasharray="1600" strokeDashoffset={interpolate(frame,[10,55],[1600,0],clamp)}/>
     <path d="M730 1210 L780 1290 L838 1195" fill="none" stroke="#F5EC0C" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity={interpolate(frame,[36,48],[0,1],clamp)}/>
    </svg>
    <PaperTag x={70} y={68} text="PAREDE OU TETO" frame={frame} start={36} color="#F7F0E0" rotate={-5} size={45}/>
   </>}
   {scene.kind==='features'&&<>
    <div style={{position:'absolute',left:'8%',top:'8%',fontFamily:'Bebas Neue,Impact,sans-serif',fontWeight:900,fontSize:106,lineHeight:.86,color:'#F8F0E0',textShadow:'8px 8px 0 rgba(0,0,0,.18)'}}>CONECTA<br/>E RODA</div>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={38} y={37} width={535} rotation={-8} start={10}/>
    <PaperTag x={7} y={42} text="ANDROID 11" frame={frame} start={5} color="#F5EC0C" rotate={-4}/>
    <PaperTag x={8} y={53} text="WI-FI + BT" frame={frame} start={16} color="#FFF8E8" rotate={3}/>
    <PaperTag x={8} y={64} text="HDMI + USB" frame={frame} start={27} color="#DDEBFA" rotate={-3}/>
    <MarkerScribble frame={frame} start={37} x={60} y={28} width={330} color="#F5EC0C" rotate={-7}/>
   </>}
   {scene.kind==='truth'&&<>
    <div style={{position:'absolute',left:'8%',top:'8%',fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:55,fontWeight:900,letterSpacing:2}}>AQUI ESTÁ A PEGADINHA</div>
    <div style={{position:'absolute',left:'7%',top:'20%',fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:260,fontWeight:900,lineHeight:.8,color:'#171717',letterSpacing:-10}}>4K</div>
    <MarkerScribble frame={frame} start={10} x={4} y={23} width={690} rotate={-5}/>
    <PaperTag x={8} y={39} text="ACEITA SINAL ≠ 4K NATIVO" frame={frame} start={19} color="#F5EC0C" rotate={-2} size={37}/>
    <div style={{position:'absolute',left:'7%',top:'51%',fontFamily:'Bebas Neue,Impact,sans-serif',fontWeight:900,fontSize:130,lineHeight:.9,color:'#C11314',letterSpacing:-3}}>1024 ×<br/>768</div>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={52} y={57} width={390} rotation={7} start={27}/>
    <HeadlineStrip text="RESOLUÇÃO NATIVA NA OFERTA" step={Math.max(0,Math.floor((frame-36)/2))} sizePctH={3.1} x={8} y={82} bg="#C11314" fg="#FFF8E8" rot={-2}/>
   </>}
   {scene.kind==='room'&&<>
    <div style={{position:'absolute',inset:'0 0 28% 0',background:'linear-gradient(145deg,rgba(7,12,30,0),rgba(7,12,30,.7))'}}/>
    <div style={{position:'absolute',left:'8%',top:'8%',color:'#F8F0E0',fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:110,fontWeight:900,lineHeight:.88}}>LUZ BAIXA.<br/>SOM À PARTE.</div>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={43} y={38} width={480} rotation={5} start={10}/>
    <PaperTag x={8} y={64} text="QUARTO ESCURO" frame={frame} start={12} color="#F5EC0C" rotate={-3}/>
    <PaperTag x={9} y={73} text="CAIXA BLUETOOTH?" frame={frame} start={25} color="#FFF8E8" rotate={2}/>
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{position:'absolute',inset:0}}>
     <path d="M110 1080 L110 660 L470 475 L830 660 L830 1080" fill="none" stroke="#F5EC0C" strokeWidth="13" opacity=".8"/>
     <path d="M470 475 L470 860 L110 1080 M470 860 L830 1080" fill="none" stroke="#F5EC0C" strokeWidth="7" opacity=".35"/>
    </svg>
   </>}
   {scene.kind==='verdict'&&<>
    <div style={{position:'absolute',left:'7%',top:'9%',fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:60,fontWeight:900,letterSpacing:2,color:'#FFF8E8'}}>VEREDITO DO VETOR</div>
    <CutLetters text="PRATICIDADE" step={step} sizePctH={6.2} x={7} y={19} seed="hy300-verdict" perChar={1} styles={[{bg:'#FFF8E8',fg:'#171717',font:'Bebas Neue,Impact,sans-serif'},{bg:'#F5EC0C',fg:'#171717',font:'Bebas Neue,Impact,sans-serif'}]} rotRange={4}/>
    <HeadlineStrip text="SIM — PARA USO CASUAL" step={Math.max(0,Math.floor((frame-14)/2))} sizePctH={4.2} x={8} y={32} bg="#F5EC0C" fg="#171717" rot={-2}/>
    <ProductPrint imageUrl={imageUrl} frame={frame} x={37} y={41} width={520} rotation={-5} start={20}/>
    <HeadlineStrip text="CINEMA 4K NATIVO? NÃO." step={Math.max(0,Math.floor((frame-32)/2))} sizePctH={4.1} x={9} y={79} bg="#171717" fg="#FFF8E8" rot={2}/>
   </>}
   <Scraps items={scraps} step={step} seed={'hy300-'+scene.kind}/>
   <Grain seed={step} opacity={.085} blend="multiply"/>
   <div style={{position:'absolute',left:'6%',right:'6%',top:'91%',height:3,background:p.paper,opacity:.34}}/>
   <div style={{position:'absolute',left:'6%',top:'92%',fontFamily:'Courier New,monospace',fontSize:23,fontWeight:700,color:p.ink,opacity:.8,letterSpacing:2}}>VETOR.BLOG / {String(scene.id).padStart(2,'0')}</div>
  </CameraBoard>
  <div style={{position:'absolute',left:'6%',top:'4%',fontFamily:'Courier New,monospace',fontSize:22,color:p.ink,opacity:.62,letterSpacing:2}}>{scene.kicker}</div>
  {frame<8?<AbsoluteFill style={{background:p.paper,clipPath:`polygon(0 0,100% 0,100% ${Math.max(0,100-frame*15)}%,0 ${Math.max(0,100-frame*15)}%)`}}/>:null}
 </AbsoluteFill>;
};

const MascotLayer:React.FC<{scenes:HY300ReferenceScene[]}>=({scenes})=>{
 const {width,height}=useVideoConfig();
 const script:{at:number;action:string;dur:number;x?:number}[]=[];
 const expressions:{at:number;mouth:string;brows:string;steam:string;look?:[number,number]}[]=[];
 for(const scene of scenes){
  const len=Math.max(1,scene.endFrame-scene.startFrame);
  let cursor=scene.startFrame;
  const add=(action:string,dur:number,x?:number)=>{
   const d=Math.max(1,Math.min(Math.floor(dur),scene.endFrame-cursor));
   if(d>0){script.push({at:cursor,action,dur:d,...(x===undefined?{}:{x})});cursor+=d;}
  };
  if(scene.kind==='hook'){
   add('walk',Math.min(24,len*.24),-.34);add('point',Math.min(34,len*.34),-.34);add('idle',scene.endFrame-cursor);
   expressions.push({at:scene.startFrame,mouth:'smile',brows:'happy',steam:'lazy',look:[0,0]});
  } else if(scene.kind==='rotate'){
   add('point',Math.min(18,len*.24),-.34);add('hop',Math.min(20,len*.26),-.28);add('point',scene.endFrame-cursor,-.34);
   expressions.push({at:scene.startFrame,mouth:'o',brows:'up',steam:'alarm',look:[.5,-.2]});
  } else if(scene.kind==='features'){
   add('walk',Math.min(18,len*.2),-.23);add('point',Math.min(30,len*.32),-.32);add('wave',scene.endFrame-cursor,-.28);
   expressions.push({at:scene.startFrame,mouth:'smile',brows:'happy',steam:'lazy',look:[.7,0]});
  } else if(scene.kind==='truth'){
   add('hop',Math.min(18,len*.18),-.36);add('point',Math.min(42,len*.42),-.36);add('idle',scene.endFrame-cursor);
   expressions.push({at:scene.startFrame,mouth:'wavy',brows:'worried',steam:'bitter',look:[.8,-.3]});
  } else if(scene.kind==='room'){
   add('walk',Math.min(18,len*.2),-.34);add('point',Math.min(26,len*.28),-.34);add('idle',scene.endFrame-cursor);
   expressions.push({at:scene.startFrame,mouth:'o',brows:'up',steam:'lazy',look:[.5,0]});
  } else {
   add('cheer',Math.min(32,len*.34),-.3);add('wave',scene.endFrame-cursor,-.3);
   expressions.push({at:scene.startFrame,mouth:'grin',brows:'happy',steam:'heart',look:[0,0]});
  }
 }
 const charProps:ToonObjectCharacterProps={
  body:'box3d',color:'#F5F1E8',ink:'#171717',accent:'#D72E27',background:'transparent',floor:'transparent',
  expressions,script,startX:-.58,bpm:116,boil:1.25,onTwos:true,size:.62,shadow:true,transparent:true,floorY:.78,
 };
 return <div style={{position:'absolute',left:0,top:0,width,height,pointerEvents:'none',zIndex:20}}><ToonObjectCharacter {...charProps}/></div>;
};

export const HY300ReferenceShort:React.FC<HY300ReferenceShortProps>=({imageUrl,voiceUrl,musicUrl,effectsUrl,scenes})=>(
 <AbsoluteFill style={{background:'#F4E9D5'}}>
  <CollageFilters scale={1} seed={17}/>
  {scenes.map(scene=><Sequence key={scene.id} from={scene.startFrame} durationInFrames={Math.max(1,scene.endFrame-scene.startFrame)}><BeatScene scene={scene} imageUrl={imageUrl}/></Sequence>)}
  <MascotLayer scenes={scenes}/>
  <Audio src={staticFile(voiceUrl)} volume={1}/>
  <Audio src={staticFile(musicUrl)} volume={.27}/>
  <Audio src={staticFile(effectsUrl)} volume={.34}/>
 </AbsoluteFill>
);
