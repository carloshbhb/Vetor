import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const publicDir = path.join(project, 'public', 'hy300-test');
const workDir = '/tmp/vetor-hy300-test-work';
const outputPath = '/tmp/vetor-hy300-test.mp4';
const propsPath = '/tmp/vetor-hy300-test-props.json';
const fps = 30;

const assets = [
  {
    name: 'projector-main.webp',
    url: 'https://http2.mlstatic.com/D_Q_NP_994475-MLA99454017486_112025-O.webp',
  },
  {
    name: 'projector-ports.jpg',
    url: 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-m9dksag5xq2h44',
  },
  {
    name: 'projector-dimensions.jpg',
    url: 'https://plazavea.vteximg.com.br/arquivos/ids/30375053-418-418/imageUrl_6.jpg',
  },
];

const segments = [
  {
    kind: 'hook',
    text: 'O HY300 promete cinema em casa e o título fala em 4K. Mas existe um detalhe importante na ficha técnica desta oferta que você precisa conhecer antes de comprar.',
  },
  {
    visualType: 'overview',
    visualCue: 'Pequeno no formato, flexível no posicionamento',
    imageUrl: '/hy300-test/projector-main.webp',
    bullets: ['CERCA DE 500 G', 'ROTAÇÃO DE 180°', 'PAREDE OU TETO'],
    text: 'O HY300 VLX é um projetor compacto com suporte articulado, pensado para ser colocado em diferentes posições.',
    narration: 'O HY300 da VLX tem corpo compacto, acabamento branco e um suporte que permite direcionar a lente. A ficha informa peso aproximado de 500 gramas e rotação de até 180 graus, então você pode projetar na parede ou no teto. Só não esqueça: ele precisa permanecer conectado à energia.',
  },
  {
    visualType: 'specification',
    visualCue: 'Android 11 integrado',
    imageUrl: '/hy300-test/projector-main.webp',
    metric: 'ANDROID 11',
    metricLabel: 'SISTEMA INFORMADO NO ANÚNCIO',
    text: 'Aplicativos compatíveis podem ser acessados diretamente no projetor, sem TV box separado.',
    narration: 'O sistema Android 11 integrado permite abrir aplicativos diretamente no aparelho, sem depender de um TV box em usos compatíveis. Mas atenção: disponibilidade, certificação e funcionamento de cada aplicativo podem variar. Não presuma que todos os serviços de streaming vão funcionar perfeitamente; confira a compatibilidade da versão vendida.',
  },
  {
    visualType: 'detail',
    visualCue: 'Conexões para diferentes aparelhos',
    imageUrl: '/hy300-test/projector-ports.jpg',
    bullets: ['WI-FI', 'BLUETOOTH', 'HDMI E USB'],
    text: 'A oferta informa conexão sem fio e entradas para ligar dispositivos externos.',
    narration: 'Na conectividade, o anúncio informa Wi-Fi e Bluetooth, além de entrada HDMI e conexão USB descrita na oferta. Isso permite considerar notebook, videogame e outros equipamentos compatíveis. O Bluetooth também pode ser útil para parear uma caixa de som ou fone sem fio.',
  },
  {
    visualType: 'specification',
    visualCue: 'Tela grande exige ambiente adequado',
    imageUrl: '/hy300-test/projector-dimensions.jpg',
    metric: '40–150″',
    metricLabel: 'FAIXA DE TELA INFORMADA',
    text: 'A oferta indica projeção entre 40 e 150 polegadas, com distância de 1 a 4,2 metros.',
    narration: 'A oferta informa projeção de 40 a 150 polegadas e distância de aproximadamente 1 a 4,2 metros. O tamanho real depende da distância, do foco e do ambiente. Para uma imagem mais agradável, prefira uma parede lisa e clara e reduza a iluminação do cômodo. Em ambientes claros, a imagem tende a perder contraste.',
  },
  {
    visualType: 'tradeoff',
    visualCue: 'Atenção: 4K não é a resolução nativa',
    imageUrl: '/hy300-test/projector-main.webp',
    bullets: ['TÍTULO: 4K / FULL HD', 'FICHA: 1024 × 768 NATIVOS', 'SUPORTE INFORMADO: HD 720P'],
    text: 'A ficha desta oferta informa resolução nativa de 1024 × 768 pixels; não é um projetor 4K nativo.',
    narration: 'Este é o ponto mais importante da análise. O título usa as expressões Full HD e 4K, mas a ficha técnica desta oferta informa resolução nativa de 1024 por 768 pixels e suporte a HD 720p. Portanto, não compre esperando uma imagem 4K nativa. A especificação pode variar entre versões e vendedores, então confirme a ficha do anúncio exato antes de fechar o pedido.',
  },
  {
    visualType: 'tradeoff',
    visualCue: 'Som integrado: conveniência, não potência',
    imageUrl: '/hy300-test/projector-ports.jpg',
    bullets: ['ALTO-FALANTE INTEGRADO', 'BLUETOOTH PARA ÁUDIO EXTERNO', 'PRECISA DE TOMADA'],
    text: 'O som interno quebra o galho, mas avaliações resumidas indicam que uma caixa externa pode melhorar a experiência.',
    narration: 'O aparelho tem alto-falante integrado, o que ajuda na praticidade. Porém, o resumo das opiniões de compradores aponta que o áudio pode ser limitado. Para filmes e séries, considere uma caixa Bluetooth compatível. Outro detalhe: o projetor funciona ligado à tomada, então planeje o cabo e a posição antes de instalar.',
  },
  {
    visualType: 'specification',
    visualCue: 'O que dizem os compradores',
    imageUrl: '/hy300-test/projector-main.webp',
    metric: '4,7 / 5',
    metricLabel: '25 MIL+ AVALIAÇÕES NA OFERTA',
    text: 'A página consultada também indica mais de 50 mil unidades vendidas. Os números podem mudar com o tempo.',
    narration: 'Na consulta da oferta, o produto aparece com nota 4,7 de 5, mais de 25 mil avaliações e mais de 50 mil unidades vendidas. É um volume expressivo de feedback, mas vale ler comentários recentes e observar fotos de compradores, especialmente sobre foco, brilho, som e funcionamento dos aplicativos. A nota do marketplace não substitui a conferência da versão anunciada.',
  },
  {
    visualType: 'result',
    visualCue: 'Para quem o HY300 faz sentido?',
    imageUrl: '/hy300-test/projector-main.webp',
    bullets: ['USO OCASIONAL', 'QUARTO ESCURO', 'EXPECTATIVA REALISTA'],
    text: 'É um projetor de entrada para quem aceita as limitações de imagem, brilho e áudio.',
    narration: 'Nosso veredito, com base na ficha e nas avaliações: o HY300 pode fazer sentido como projetor de entrada, compacto, para uso ocasional em um quarto escuro. Não é a melhor escolha para uma sala clara, para quem exige áudio forte sem acessório ou para quem espera resolução 4K verdadeira. Confira as especificações do vendedor, leia as avaliações mais recentes e veja o link do produto na descrição.',
  },
];

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(label + ' falhou: ' + String(result.stderr || result.stdout || 'sem detalhes').slice(-3000));
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

for (const asset of assets) {
  const output = path.join(publicDir, asset.name);
  if (!fs.existsSync(output) || fs.statSync(output).size < 1000) {
    console.log('[ASSET] Baixando ' + asset.name);
    run('curl', ['--fail', '--location', '--retry', '3', '--retry-delay', '2', '--user-agent', 'Mozilla/5.0', asset.url, '--output', output], 'Download de imagem');
  }
  if (fs.statSync(output).size < 1000) throw new Error('Imagem ausente ou inválida: ' + asset.name);
}

const ttsSegments = [segments[0].text, ...segments.slice(1).map((scene) => scene.narration)];
const audioFiles = [];
const durations = [];

for (let index = 0; index < ttsSegments.length; index += 1) {
  const file = path.join(workDir, 'segment-' + String(index).padStart(2, '0') + '.mp3');
  console.log('[EDGE_TTS] Segmento ' + (index + 1) + '/' + ttsSegments.length);
  run('edge-tts', ['--voice', 'pt-BR-FranciscaNeural', '--rate', '+0%', '--text', ttsSegments[index], '--write-media', file], 'Edge TTS');
  audioFiles.push(file);
  durations.push(mediaDuration(file));
}

const concatList = path.join(workDir, 'concat.txt');
fs.writeFileSync(concatList, audioFiles.map((file) => "file '" + file.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
const audioPath = path.join(publicDir, 'voiceover.mp3');
run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-c:a', 'libmp3lame', '-q:a', '2', audioPath], 'Concatenação de voz');

let cursor = durations[0];
const hookDuration = durations[0];
const subtitleEntries = [{ start: 0, end: hookDuration, text: segments[0].text }];

const scenes = segments.slice(1).map((scene, index) => {
  const duration = durations[index + 1];
  const startFrame = Math.round(cursor * fps);
  cursor += duration;
  const endFrame = Math.round(cursor * fps);
  subtitleEntries.push({ start: startFrame / fps, end: endFrame / fps, text: scene.narration });
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
    bullets: scene.bullets,
    leftTitle: scene.leftTitle,
    leftText: scene.leftText,
    rightTitle: scene.rightTitle,
    rightText: scene.rightText,
  };
});

const totalDuration = cursor;
const props = {
  title: 'Mini Projetor HY300 VLX: vale a pena?',
  category: 'Projetores',
  hook: 'HY300 promete 4K. Mas a ficha técnica conta outra história.',
  imageUrl: '/hy300-test/projector-main.webp',
  productImages: [
    '/hy300-test/projector-main.webp',
    '/hy300-test/projector-ports.jpg',
    '/hy300-test/projector-dimensions.jpg',
  ],
  scenes,
  audioUrl: '/hy300-test/voiceover.mp3',
  subtitleEntries,
  callToAction: 'Confira a oferta, a ficha técnica e as avaliações recentes antes de comprar.',
  totalDuration,
  hookDuration,
  fps,
};

fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
console.log('[HY300] Duração estimada: ' + totalDuration.toFixed(2) + 's; cenas=' + scenes.length + '; voz Edge TTS pt-BR-FranciscaNeural.');
console.log('[HY300] Render isolado; nenhuma fila, Supabase ou API do YouTube será chamada.');

run('npx', [
  'remotion', 'render', 'src/Root.tsx', 'LongFormEditorialV2', outputPath,
  '--props=' + propsPath,
  '--codec=h264',
  '--crf=22',
  '--log=error',
], 'Remotion render');

if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100000) {
  throw new Error('Remotion não produziu um MP4 de teste válido.');
}
console.log('[HY300_RENDER_PASS] ' + outputPath + ' | ' + mediaDuration(outputPath).toFixed(2) + 's | ' + fs.statSync(outputPath).size + ' bytes.');
