import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(project,'public','hy300-reference');
const workDir='/tmp/vetor-hy300-reference-work';
const output=path.join(project,'out','hy300-reference-short.mp4');
const propsPath='/tmp/vetor-hy300-reference-props.json';
const fps=24;
const segments=[
 {kind:'hook',headline:'4K?!',kicker:'PROMESSA OU PEGADINHA?',narration:'Esse mini projetor chama atenção pelo tamanho e pela promessa de quatro K. Mas espera: tem um detalhe na ficha dessa oferta que muda a expectativa.'},
 {kind:'rotate',headline:'GIRA 180 GRAUS',kicker:'SUPORTE ARTICULADO',narration:'O suporte articulado gira até cento e oitenta graus e ajuda a direcionar a projeção para a parede ou para o teto.'},
 {kind:'features',headline:'ANDROID + CONEXÕES',kicker:'O QUE A OFERTA INFORMA',narration:'A oferta também informa Android onze, Wi-Fi, Bluetooth e HDMI. Parece bem completo para uma opção compacta.'},
 {kind:'truth',headline:'1024 POR 768',kicker:'O DETALHE MAIS IMPORTANTE',narration:'Só que a ficha desta oferta informa resolução nativa de mil e vinte e quatro por setecentos e sessenta e oito pixels. Aceitar um sinal quatro K não é projetar em quatro K.'},
 {kind:'room',headline:'AMBIENTE ESCURO',kicker:'EXPECTATIVA REALISTA',narration:'Para assistir, um quarto escuro ajuda. E o som integrado pode não bastar; uma caixa Bluetooth externa pode melhorar a experiência.'},
 {kind:'verdict',headline:'PRATICIDADE, SIM',kicker:'VEREDITO',narration:'Veredito: praticidade para uso casual, sim. Cinema quatro K, não. Confira a ficha exata do vendedor antes de comprar.'},
];

function run(command,args,label){
 const result=spawnSync(command,args,{cwd:project,encoding:'utf8',maxBuffer:16*1024*1024});
 if(result.status!==0) throw new Error(label+' falhou: '+String(result.stderr||result.stdout||'sem detalhe').slice(-4500));
 return String(result.stdout||'').trim();
}
function duration(file){
 const d=Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],'ffprobe'));
 if(!Number.isFinite(d)||d<=0) throw new Error('Duração inválida: '+file);
 return d;
}
function writeWav(file,seconds,events){
 const sr=44100,channels=2,n=Math.ceil(seconds*sr),mix=new Float32Array(n);
 let seed=9527;
 const noise=()=>{seed=seed*16807%2147483647;return seed/1073741823.5-1;};
 for(const ev of events){
  const at=Math.max(0,Math.floor(ev.at*sr)),len=Math.min(n-at,Math.ceil(ev.len*sr));
  for(let i=0;i<len;i++){
   const t=i/sr,p=i/Math.max(1,len);
   let v=0;
   if(ev.kind==='kick') v=Math.sin(2*Math.PI*(96*Math.exp(-t*15)+38)*t)*Math.exp(-t*18)*.75;
   else if(ev.kind==='snare') v=(noise()*.55+Math.sin(2*Math.PI*190*t)*.25)*Math.exp(-t*23);
   else if(ev.kind==='hat') v=noise()*Math.exp(-t*75)*.14;
   else if(ev.kind==='thump') v=(Math.sin(2*Math.PI*(150-95*p)*t)*.75+noise()*.12)*Math.exp(-t*19);
   else v=(noise()*.7+Math.sin(2*Math.PI*740*t)*.15)*Math.exp(-t*32)*.3;
   mix[at+i]+=v*(ev.gain??1);
  }
 }
 const header=Buffer.alloc(44),bytes=n*channels*2;
 header.write('RIFF',0);header.writeUInt32LE(36+bytes,4);header.write('WAVE',8);header.write('fmt ',12);
 header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(channels,22);header.writeUInt32LE(sr,24);
 header.writeUInt32LE(sr*channels*2,28);header.writeUInt16LE(channels*2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes,40);
 const pcm=Buffer.alloc(bytes);
 for(let i=0;i<n;i++){const q=Math.round(Math.max(-.98,Math.min(.98,mix[i]))*32767);pcm.writeInt16LE(q,i*4);pcm.writeInt16LE(q,i*4+2);}
 fs.writeFileSync(file,Buffer.concat([header,pcm]));
}
function bedEvents(seconds,bpm=116){
 const beat=60/bpm,events=[];
 for(let t=0,k=0;t<seconds;t+=beat,k++){
  events.push({kind:k%4===0?'kick':'snare',at:t,len:k%4===0?.2:.12,gain:k%4===0?.52:.32});
  events.push({kind:'hat',at:t+beat*.5,len:.035,gain:.6});
  if(k%8===0) events.push({kind:'kick',at:t+beat*.75,len:.13,gain:.23});
 }
 return events;
}

fs.mkdirSync(publicDir,{recursive:true});
fs.mkdirSync(workDir,{recursive:true});
fs.mkdirSync(path.dirname(output),{recursive:true});

const productImage=path.join(publicDir,'projector-main.webp');
if(!fs.existsSync(productImage)||fs.statSync(productImage).size<1000){
 console.log('[ASSET] Baixando fotografia principal da oferta HY300.');
 run('curl',['--fail','--location','--retry','4','--retry-delay','2','--connect-timeout','15','--max-time','90','--user-agent','Mozilla/5.0',
  'https://http2.mlstatic.com/D_Q_NP_994475-MLA99454017486_112025-O.webp','--output',productImage],'Download da fotografia');
}
if(fs.statSync(productImage).size<1000) throw new Error('Fotografia HY300 ausente/inválida.');

const audioFiles=[],audioDurations=[];
for(let i=0;i<segments.length;i++){
 const file=path.join(workDir,'voice-'+String(i).padStart(2,'0')+'.mp3');
 console.log('[EDGE_TTS] Trecho '+(i+1)+'/'+segments.length);
 run('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate','+5%','--text',segments[i].narration,'--write-media',file],'Edge TTS');
 audioFiles.push(file);audioDurations.push(duration(file));
}
const concatList=path.join(workDir,'concat.txt');
fs.writeFileSync(concatList,audioFiles.map(file=>"file '"+file.replace(/'/g,"'\\''")+"'").join('\n')+'\n');
const voiceFile=path.join(publicDir,'voiceover.mp3');
run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',concatList,'-c:a','libmp3lame','-q:a','2',voiceFile],'Concatenação da voz');
const voiceDuration=duration(voiceFile);
let cursor=0;
const scenes=segments.map((segment,index)=>{
 const startFrame=Math.round(cursor*fps);
 cursor+=audioDurations[index];
 return {id:index+1,kind:segment.kind,startFrame,endFrame:Math.max(startFrame+1,Math.round(cursor*fps)),narration:segment.narration,headline:segment.headline,kicker:segment.kicker};
});
const totalDurationFrames=Math.max(Math.ceil(voiceDuration*fps),scenes[scenes.length-1].endFrame);
writeWav(path.join(publicDir,'music.wav'),voiceDuration+.7,bedEvents(voiceDuration+.7));
writeWav(path.join(publicDir,'effects.wav'),voiceDuration+.5,scenes.map((scene,index)=>({
 kind:index===3?'thump':'paper',
 at:Math.max(0,scene.startFrame/fps+.08),
 len:index===3?.32:.13,
 gain:index===3?.75:.55,
})));
const props={
 title:'Mini projetor HY300: a promessa de 4K tem um detalhe',
 imageUrl:'hy300-reference/projector-main.webp',
 voiceUrl:'hy300-reference/voiceover.mp3',
 musicUrl:'hy300-reference/music.wav',
 effectsUrl:'hy300-reference/effects.wav',
 scenes,totalDurationFrames,fps,
};
fs.writeFileSync(propsPath,JSON.stringify(props,null,2));
console.log('[HY300_REFERENCE] voice='+voiceDuration.toFixed(2)+'s; fps='+fps+'; scenes='+scenes.length+'; frames='+totalDurationFrames);
run('npx',['remotion','render','src/RootHY300Reference.tsx','HY300ReferenceShort',output,
 '--props='+propsPath,'--codec=h264','--crf=18','--log=error'],'Remotion render');
if(!fs.existsSync(output)||fs.statSync(output).size<300000) throw new Error('MP4 ausente ou pequeno demais.');
const finalDuration=duration(output);
const metadata=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,codec_type','-show_entries','format=duration,size','-of','json',output],'ffprobe'));
const video=metadata.streams.find(s=>s.codec_type==='video');
const audio=metadata.streams.find(s=>s.codec_type==='audio');
if(!video||video.codec_name!=='h264'||video.width!==1080||video.height!==1920||video.r_frame_rate!=='24/1') throw new Error('Formato H.264 1080×1920 24fps não validado.');
if(!audio) throw new Error('Faixa de áudio ausente.');
if(finalDuration<18||finalDuration>60) throw new Error('Duração fora da faixa 18–60 s: '+finalDuration.toFixed(2));
console.log('[HY300_REFERENCE_RENDER_PASS] '+output+' | '+finalDuration.toFixed(2)+'s | '+fs.statSync(output).size+' bytes.');
