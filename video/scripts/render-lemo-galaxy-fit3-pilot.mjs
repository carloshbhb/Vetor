import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderWithLemoOpuscar } from "./render-lemo-opuscar.mjs";

const root = path.resolve("video");
const audioPath = path.join(root, "public", "tmp", "lemo-galaxy-fit3-pilot.mp3");
const outputPath = path.join(root, "artifacts", "vetor-lemo-galaxy-fit3-motion-pilot.mp4");
const narration = "A Galaxy Fit3 parece completa, mas tem três detalhes que você precisa saber antes de comprar. Primeiro: a tela AMOLED de 1,6 polegada é grande e fácil de ler. Segundo: a Samsung anuncia até treze dias de bateria, dependendo do uso. E ela ainda traz estrutura de alumínio, proteção IP68 e 5 ATM. Agora o ponto que muda a decisão: ela não tem GPS integrado. Para registrar o trajeto, precisa levar o celular. Também não tem NFC para pagamentos por aproximação. Então, vale a pena? Se você quer notificações, treinos e uma tela bonita gastando menos, pode fazer sentido. Se precisa de GPS independente ou pagamentos no pulso, procure outra opção. Confira a análise completa no Vetor.blog.";
fs.mkdirSync(path.dirname(audioPath), { recursive: true });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
execFileSync("python", ["scripts/tts.py", narration, audioPath], { cwd: process.cwd(), stdio: "inherit" });
const audioSeconds = Number(execFileSync("ffprobe", ["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",audioPath], {encoding:"utf8"}).trim());
if (!Number.isFinite(audioSeconds) || audioSeconds < 15) throw new Error("Edge TTS produziu uma faixa inesperadamente curta.");
const fps = 30;
const beats = [
 {start:0,end:5.5,cue:"3 detalhes antes de comprar",text:"A Galaxy Fit3 parece completa. Mas existem três detalhes que você precisa saber."},
 {start:5.5,end:10.5,cue:"Tela AMOLED de 1,6 polegada",text:"Tela AMOLED de 1,6 polegada: grande, nítida e fácil de ler."},
 {start:10.5,end:15.5,cue:"Até 13 dias de bateria*",text:"A Samsung anuncia até treze dias de bateria, dependendo do uso."},
 {start:15.5,end:20.5,cue:"Alumínio • IP68 • 5 ATM",text:"Estrutura de alumínio, proteção IP68 e resistência à água de 5 ATM."},
 {start:20.5,end:26,cue:"SEM GPS INTEGRADO",text:"O detalhe que muda a decisão: não tem GPS integrado. Para registrar o trajeto, precisa do celular."},
 {start:26,end:audioSeconds-5,cue:"SEM NFC PARA PAGAMENTOS",text:"Também não tem NFC para pagamentos por aproximação."},
 {start:audioSeconds-5,end:audioSeconds,cue:"Vale a pena para o seu perfil?",text:"Se precisa de GPS independente ou pagamentos no pulso, procure outra opção. Confira a análise no Vetor.blog."},
];
const scenes = beats.map((b,i)=>({id:i+1,startFrame:Math.round(b.start*fps),endFrame:Math.max(Math.round((b.start+.5)*fps),Math.round(b.end*fps)),text:b.text,visualCue:b.cue}));
const subtitles = beats.map(b=>({start:b.start,end:b.end,text:b.text}));
const data = {
 id:"lemo-galaxy-fit3-quality-pilot",type:"review",title:"Samsung Galaxy Fit3: 3 detalhes antes de comprar",
 category:"Wearables",hook:"A Galaxy Fit3 vale a pena? Veja o detalhe que muda tudo.",callToAction:"Análise completa no Vetor.blog",scenes,subtitleEntries:subtitles,
 imageUrl:"assets/galaxy-fit3-pilot.svg",productImages:["assets/galaxy-fit3-pilot.svg"],totalDuration:audioSeconds,fps
};
await renderWithLemoOpuscar(data,outputPath,audioPath);
const probe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_entries","stream=codec_type,width,height","-show_entries","format=duration","-of","json",outputPath],{encoding:"utf8"}));
if (!probe.streams?.some(s=>s.codec_type==="video"&&s.width===1080&&s.height===1920)) throw new Error("O piloto não está em 1080x1920.");
if (!probe.streams?.some(s=>s.codec_type==="audio")) throw new Error("O piloto saiu sem narração.");
console.log(JSON.stringify({output:outputPath,duration:probe.format.duration,bytes:fs.statSync(outputPath).size,engine:"Lemo-Opuscar",published:false}));
