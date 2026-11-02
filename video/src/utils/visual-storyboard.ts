export type SceneVisualMode =
  | 'price-check'
  | 'specification'
  | 'detail'
  | 'tradeoff'
  | 'comparison'
  | 'lifestyle'
  | 'editorial';

export type SceneMotionPreset =
  | 'push-in'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-left'
  | 'tilt-right'
  | 'float';

export type SceneVisualPlan = {
  mode: SceneVisualMode;
  motion: SceneMotionPreset;
  label: string;
};

export type StoryboardScene = {
  id?: number | string;
  text?: string;
  visualCue?: string;
  brollKeywords?: string[];
};

const MOTIONS: SceneMotionPreset[] = [
  'push-in',
  'pan-left',
  'pan-right',
  'tilt-left',
  'tilt-right',
  'float',
];

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function classifySceneVisual(scene: StoryboardScene, index = 0): SceneVisualMode {
  const text = normalize([scene.visualCue, scene.text].filter(Boolean).join(' '));

  if (/preco|valor|custo|frete|oferta|economia|parcelamento/.test(text)) return 'price-check';
  if (/limitacao|ponto de atencao|ressalva|contra|nao possui|ausencia|incompatibilidade|garantia/.test(text)) return 'tradeoff';
  if (/compar|versus|\bvs\b|alternativa|concorrente/.test(text)) return 'comparison';
  if (/bateria|autonomia|mah|armazenamento|memoria ram|\bram\b|\bgb\b|\btb\b|\bhz\b|\bmp\b|\bw\b|\bghz\b|\bmhz\b|resolucao|\b2\.\d+k\b/.test(text)) return 'specification';
  if (/tela|display|camera|acabamento|material|construcao|design|porta|audio|microfone|bluetooth|conexao|ergonomia/.test(text)) return 'detail';
  if (/rotina|dia a dia|estudo|trabalho|jogo|jogos|assistir|mobilidade|portatil|conforto|uso real/.test(text)) return 'lifestyle';
  return index % 2 === 0 ? 'editorial' : 'detail';
}

export function sceneVisualLabel(mode: SceneVisualMode): string {
  const labels: Record<SceneVisualMode, string> = {
    'price-check': 'DECISÃO DE COMPRA',
    specification: 'DADO QUE IMPORTA',
    detail: 'OLHO NO DETALHE',
    tradeoff: 'PONTO DE ATENÇÃO',
    comparison: 'CRITÉRIO DE COMPARAÇÃO',
    lifestyle: 'NA PRÁTICA',
    editorial: 'ANÁLISE VETOR',
  };
  return labels[mode];
}

export function createSceneVisualPlan(scenes: StoryboardScene[], seed = 'vetor'): SceneVisualPlan[] {
  let previousMotion: SceneMotionPreset | null = null;
  return (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
    const mode = classifySceneVisual(scene, index);
    const input = [
      seed,
      scene.id ?? index,
      scene.visualCue ?? '',
      scene.text ?? '',
      (scene.brollKeywords ?? []).join('|'),
    ].join(':');
    let motion = MOTIONS[hashText(input) % MOTIONS.length];
    if (motion === previousMotion) {
      motion = MOTIONS[(MOTIONS.indexOf(motion) + 1 + (index % (MOTIONS.length - 1))) % MOTIONS.length];
    }
    previousMotion = motion;
    return { mode, motion, label: sceneVisualLabel(mode) };
  });
}

export function extractPrimaryMetric(text: string): string | null {
  const match = String(text || '').match(
    /\b\d+(?:[.,]\d+)?\s?(?:mAh|GB|TB|Hz|MP|W|mm|cm|polegadas|pol|GHz|MHz|fps|K|%)\b/i,
  );
  return match?.[0]?.replace(/\s+/g, ' ') ?? null;
}
