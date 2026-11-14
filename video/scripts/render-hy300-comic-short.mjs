import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const publicDir = path.join(project, 'public', 'hy300-comic');
const workDir = '/tmp/vetor-hy300-comic-work';
const outputPath = '/tmp/vetor-hy300-comic-short.mp4';
const propsPath = '/tmp/vetor-hy300-comic-props.json';
const fps = 30;

const segments = [
  {
    kind: 'hook',
    narration: 'O HY trezentos promete quatro K. Mas tem um detalhe que muda tudo.'
  },
  {
    kind: 'rotate',
    narration: 'Ele é compacto e gira até cento e oitenta graus para jogar a imagem na parede ou no teto.'
  },
  {
    kind: 'smart',
    narration: 'Tem Android onze, Wi-Fi, Bluetooth e HDMI para conectar aparelhos compatíveis.'
  },
  {
    kind: 'truth',
    narration: 'Agora, a pegadinha: a ficha desta oferta informa resolução nativa de mil e vinte e quatro por setecentos e sessenta e oito. Receber sinal quatro K não é projetar em quatro K.'
  },
  {
    kind: 'room',
    narration: 'Ele faz mais sentido no quarto escuro, para uso casual. E o som pode pedir uma caixa Bluetooth.'
  },
  {
    kind: 'verdict',
    narration: 'Resumo: praticidade, sim. Cinema quatro K, não. Você compraria sabendo disso?'
  },
];

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(label + ' falhou: ' + String(result.stderr || result.stdout || 'sem detalhes').slice(-4000));
  }
  return String(result.stdout || '').trim();
}

function duration(file) {
  const raw = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], 'ffprobe');
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Duração inválida: ' + file);
  return value;
}

function writeMusicWav(file, seconds, bpm = 116) {
  const sampleRate = 44100;
  const channels = 2;
  const sampleCount = Math.ceil(seconds * sampleRate);
  const mix = new Float32Array(sampleCount);
  const beat = 60 / bpm;
  const events = [];

  for (let t = 0, n = 0; t < seconds; t += beat, n += 1) {
    if (n % 4 === 0 || n % 4 === 2) events.push({ type: 'kick', at: t });
    if (n % 4 === 1 || n % 4 === 3) events.push({ type: 'snare', at: t });
    events.push({ type: 'hat', at: t });
    if (n % 4 === 2) events.push({ type: 'hat', at: t + beat / 2 });
    if (n % 8 === 0) events.push({ type: 'bass', at: t + beat * .03 });
  }

  let seed = 1234567;
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 1073741823.5) - 1;
  };

  for (const event of events) {
    const start = Math.max(0, Math.floor(event.at * sampleRate));
    let length = 0;
    if (event.type === 'kick') length = Math.floor(.22 * sampleRate);
    if (event.type === 'snare') length = Math.floor(.13 * sampleRate);
    if (event.type === 'hat') length = Math.floor(.045 * sampleRate);
    if (event.type === 'bass') length = Math.floor(.24 * sampleRate);
    const end = Math.min(sampleCount, start + length);
    for (let i = start; i < end; i += 1) {
      const t = (i - start) / sampleRate;
      let v = 0;
      if (event.type === 'kick') {
        const freq = 112 * Math.exp(-t * 12) + 38;
        v = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 17) * .92;
      } else if (event.type === 'snare') {
        v = (noise() * .62 + Math.sin(2 * Math.PI * 185 * t) * .18) * Math.exp(-t * 27);
      } else if (event.type === 'hat') {
        v = noise() * Math.exp(-t * 72) * .16;
      } else if (event.type === 'bass') {
        v = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 7) * .16;
      }
      mix[i] += v;
    }
  }

  const header = Buffer.alloc(44);
  const dataBytes = sampleCount * channels * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const pcm = Buffer.alloc(dataBytes);
  for (let i = 0; i < sampleCount; i += 1) {
    const v = Math.max(-1, Math.min(1, mix[i] * .42));
    const sample = Math.round(v * 32767);
    pcm.writeInt16LE(sample, i * 4);
    pcm.writeInt16LE(sample, i * 4 + 2);
  }
  fs.writeFileSync(file, Buffer.concat([header, pcm]));
}

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });

const sourceProduct = path.join(project, 'public', 'hy300-test', 'projector-main.webp');
const productImage = path.join(publicDir, 'projector-main.webp');
if (!fs.existsSync(sourceProduct)) throw new Error('Foto principal do HY300 não encontrada no asset pack do piloto.');
fs.copyFileSync(sourceProduct, productImage);

const audioFiles = [];
const audioDurations = [];
for (let i = 0; i < segments.length; i += 1) {
  const output = path.join(workDir, 'voice-' + String(i).padStart(2, '0') + '.mp3');
  console.log('[EDGE_TTS] Gerando fala ' + (i + 1) + '/' + segments.length + ' (' + segments[i].kind + ').');
  run('edge-tts', [
    '--voice', 'pt-BR-FranciscaNeural',
    '--rate', '+6%',
    '--text', segments[i].narration,
    '--write-media', output,
  ], 'Edge TTS');
  audioFiles.push(output);
  audioDurations.push(duration(output));
}

const concatList = path.join(workDir, 'voice-concat.txt');
fs.writeFileSync(concatList, audioFiles.map((file) => "file '" + file.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
const voicePath = path.join(publicDir, 'voiceover.mp3');
run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-c:a', 'libmp3lame', '-q:a', '2', voicePath], 'Concatenação de voz');

const voiceDuration = duration(voicePath);
const musicPath = path.join(publicDir, 'music.wav');
writeMusicWav(musicPath, voiceDuration + .5);

let cursor = 0;
const scenes = segments.map((segment, index) => {
  const startFrame = Math.round(cursor * fps);
  cursor += audioDurations[index];
  const endFrame = Math.round(cursor * fps);
  return {
    id: index + 1,
    kind: segment.kind,
    narration: segment.narration,
    startFrame,
    endFrame,
  };
});

const totalDuration = Math.max(voiceDuration, cursor);
const props = {
  title: 'HY300: promete 4K. Mas tem um detalhe.',
  imageUrl: '/hy300-comic/projector-main.webp',
  audioUrl: '/hy300-comic/voiceover.mp3',
  musicUrl: '/hy300-comic/music.wav',
  scenes,
  totalDuration,
  fps,
};

fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
console.log('[HY300_COMIC] Duração: ' + totalDuration.toFixed(2) + 's; scenes=' + scenes.length + '; original procedural beat + Edge TTS.');
console.log('[HY300_COMIC] Render vertical 1080x1920. Nenhuma fila/YouTube/Supabase será chamada.');

run('npx', [
  'remotion', 'render', 'src/Root.tsx', 'HY300ComicShort', outputPath,
  '--props=' + propsPath,
  '--codec=h264',
  '--crf=19',
  '--log=error',
], 'Remotion render');

if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 200000) {
  throw new Error('MP4 final ausente ou inválido.');
}

const finalDuration = duration(outputPath);
console.log('[HY300_COMIC_RENDER_PASS] ' + outputPath + ' | ' + finalDuration.toFixed(2) + 's | ' + fs.statSync(outputPath).size + ' bytes.');
