import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const publicDir = path.join(project, 'public', 'longform-v2-demo');
const workDir = '/tmp/vetor-longform-v2-demo-work';
const outputPath = '/tmp/vetor-longform-v2-demo.mp4';
const propsPath = '/tmp/vetor-longform-v2-demo-props.json';
const beatsPath = '/tmp/vetor-longform-v2-demo-beats.json';
const fps = 30;

const narration = [
  {
    kind: 'hook',
    text: 'Montar um PC gamer parece complicado. Mas quando você entende o papel de cada componente, a sequência fica muito mais clara. Neste guia, vamos passar pelas peças, pelos encaixes e pelos cuidados que evitam erros na montagem.'
  },
  {
    visualType: 'overview',
    visualCue: 'Primeiro, conheça o conjunto',
    imageUrl: '/longform-v2-demo/pc-hero.svg',
    bullets: ['PLACA-MÃE', 'PROCESSADOR', 'MEMÓRIA', 'GPU E FONTE'],
    text: 'Antes de montar, coloque todas as peças em uma visão geral. Placa-mãe, processador, memória, armazenamento, fonte, gabinete e placa de vídeo precisam trabalhar juntos. A compatibilidade deve ser verificada antes de comprar ou encaixar qualquer componente.'
  },
  {
    visualType: 'detail',
    visualCue: 'A placa-mãe conecta tudo',
    imageUrl: '/longform-v2-demo/motherboard.svg',
    text: 'A placa-mãe é a base das conexões. Confira o soquete do processador, o tipo de memória suportado, o tamanho físico da placa e as conexões necessárias. Esses detalhes definem quais componentes podem ser usados em conjunto.'
  },
  {
    visualType: 'detail',
    visualCue: 'Processador: encaixe sem força',
    imageUrl: '/longform-v2-demo/motherboard.svg',
    text: 'No processador, a orientação é essencial. Localize a marca de alinhamento do soquete, abra a trava indicada pelo fabricante e posicione a peça sem pressionar. Se o encaixe não estiver correto, pare e confira as instruções da placa-mãe.'
  },
  {
    visualType: 'specification',
    visualCue: 'Memória: geração e encaixe',
    imageUrl: '/longform-v2-demo/ram.svg',
    metric: 'DDR4 / DDR5',
    metricLabel: 'PADRÕES DIFERENTES — CONFIRA A PLACA',
    text: 'A memória exige atenção à geração e à compatibilidade. DDR4 e DDR5 não são intercambiáveis. Confira também a capacidade suportada, a frequência validada e a configuração recomendada nos manuais da placa-mãe e dos módulos.'
  },
  {
    visualType: 'comparison',
    visualCue: 'GPU e fonte precisam combinar',
    leftTitle: 'PLACA DE VÍDEO',
    leftText: 'Confira dimensões, espaço no gabinete e conectores exigidos pelo modelo.',
    rightTitle: 'FONTE',
    rightText: 'Verifique potência recomendada, qualidade e conectores de alimentação compatíveis.',
    text: 'A placa de vídeo e a fonte devem ser avaliadas em conjunto. Não basta a GPU caber no gabinete: é preciso confirmar o espaço disponível e se a fonte atende às recomendações de alimentação do modelo escolhido.'
  },
  {
    visualType: 'tradeoff',
    visualCue: 'Não force conectores nem encaixes',
    imageUrl: '/longform-v2-demo/gpu.svg',
    bullets: ['Desligue e desconecte a fonte', 'Alinhe antes de pressionar', 'Confira o manual do componente'],
    text: 'Um erro comum é tentar resolver resistência usando força. Conectores têm orientação própria. Desligue a alimentação, confira a posição e consulte o manual. Se algo não encaixar naturalmente, interrompa a montagem e investigue antes de continuar.'
  },
  {
    visualType: 'result',
    visualCue: 'Checklist antes de ligar o PC',
    imageUrl: '/longform-v2-demo/pc-hero.svg',
    bullets: ['COMPATIBILIDADE', 'FIXAÇÃO', 'ALIMENTAÇÃO', 'CONEXÕES'],
    text: 'A revisão final deve confirmar que a placa está fixada, a memória está encaixada, os cabos de alimentação estão conectados e nenhum cabo interfere nas ventoinhas. Só então siga o procedimento de primeiro acionamento indicado pelos fabricantes.'
  }
];

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(label + ' falhou: ' + String(result.stderr || result.stdout || 'sem detalhes').slice(-2500));
  }
  return String(result.stdout || '').trim();
}

function mediaDuration(file) {
  const value = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], 'ffprobe');
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duração inválida em ' + file);
  return duration;
}

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });
const segments = [narration[0].text, ...narration.slice(1).map((scene) => scene.text)];
const segmentFiles = [];
const segmentDurations = [];

for (let index = 0; index < segments.length; index += 1) {
  const file = path.join(workDir, 'segment-' + String(index).padStart(2, '0') + '.mp3');
  console.log('[DEMO_TTS] Gerando segmento ' + (index + 1) + '/' + segments.length + '.');
  run('edge-tts', ['--voice', 'pt-BR-FranciscaNeural', '--rate', '+0%', '--text', segments[index], '--write-media', file], 'Edge TTS');
  segmentFiles.push(file);
  segmentDurations.push(mediaDuration(file));
}

const concatList = path.join(workDir, 'concat.txt');
fs.writeFileSync(concatList, segmentFiles.map((file) => "file '" + file.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
const audioPath = path.join(publicDir, 'voiceover.mp3');
run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-c:a', 'libmp3lame', '-q:a', '2', audioPath], 'Concatenação de narração');

let cursor = 0;
const hookDuration = segmentDurations[0];
const subtitleEntries = [{
  start: 0,
  end: hookDuration,
  text: narration[0].text,
}];
cursor = hookDuration;

const scenes = narration.slice(1).map((scene, index) => {
  const duration = segmentDurations[index + 1];
  const startFrame = Math.round(cursor * fps);
  cursor += duration;
  const endFrame = Math.round(cursor * fps);
  subtitleEntries.push({ start: startFrame / fps, end: endFrame / fps, text: scene.text });
  return {
    id: index + 1,
    text: scene.text,
    duration,
    visualCue: scene.visualCue,
    brollKeywords: [],
    startFrame,
    endFrame,
    visualType: scene.visualType,
    imageUrl: scene.imageUrl,
    metric: scene.metric,
    metricLabel: scene.metricLabel,
    leftTitle: scene.leftTitle,
    leftText: scene.leftText,
    rightTitle: scene.rightTitle,
    rightText: scene.rightText,
    bullets: scene.bullets,
  };
});

const audioDuration = mediaDuration(audioPath);
const totalDuration = Math.max(cursor, audioDuration);
const props = {
  title: 'Como montar um PC gamer: entenda cada componente',
  category: 'Hardware',
  hook: 'Monte seu PC gamer sem errar a montagem.',
  imageUrl: '/longform-v2-demo/pc-hero.svg',
  productImages: [
    '/longform-v2-demo/pc-hero.svg',
    '/longform-v2-demo/motherboard.svg',
    '/longform-v2-demo/ram.svg',
    '/longform-v2-demo/gpu.svg',
  ],
  scenes,
  audioUrl: '/longform-v2-demo/voiceover.mp3',
  subtitleEntries,
  callToAction: 'Confira compatibilidade e instruções oficiais antes de ligar o equipamento.',
  totalDuration,
  hookDuration,
  fps,
};

fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
fs.writeFileSync(beatsPath, JSON.stringify(subtitleEntries, null, 2));
console.log('[DEMO] Duração estimada: ' + totalDuration.toFixed(2) + 's; cenas=' + scenes.length + '; assets=SVG vetoriais originais.');
console.log('[DEMO] Renderizando LongFormEditorialV2. Nenhuma fila ou API de publicação será chamada.');
run('npx', [
  'remotion', 'render', 'src/Root.tsx', 'LongFormEditorialV2', outputPath,
  '--props=' + propsPath,
  '--codec=h264',
  '--crf=22',
  '--log=error',
], 'Remotion render');

if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 50000) {
  throw new Error('Remotion não produziu um MP4 de demonstração válido.');
}
const finalDuration = mediaDuration(outputPath);
console.log('[DEMO_RENDER_PASS] ' + outputPath + ' | ' + finalDuration.toFixed(2) + 's | 1920x1080 esperado | ' + fs.statSync(outputPath).size + ' bytes.');
