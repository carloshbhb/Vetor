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
  if (/limitacao|ponto de atencao|ressalva|contra|nao\b|ausencia|incompatibilidade|garantia/.test(text)) return 'tradeoff';
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

/**
 * Beats: short visual segments inside one scene.
 *
 * A 9-10 second scene showing one photo loses Shorts viewers. Splitting every scene into
 * beats of ~2.6s, each with a different treatment (hero shot, macro detail, spec callout,
 * gallery photo, B-roll cutaway), gives a visual change every few seconds while the
 * narration keeps running underneath.
 */
export type BeatKind = 'hero' | 'detail' | 'callout' | 'gallery' | 'broll';

export type SceneBeat = {
  /** Frame offsets relative to the start of the scene. */
  startFrame: number;
  endFrame: number;
  kind: BeatKind;
  /** Index into the product image list (gallery beats rotate; the others use the main image). */
  imageIndex: number;
  /** Focus point (0..1) for the macro "detail" zoom. */
  focusX: number;
  focusY: number;
};

export type BeatPlanOptions = {
  fps: number;
  targetSeconds?: number;
  minSeconds?: number;
  hasBroll?: boolean;
  hasMetric?: boolean;
  imageCount?: number;
  seed?: string;
};

const FOCUS_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.34, 0.36],
  [0.66, 0.4],
  [0.5, 0.66],
  [0.5, 0.28],
];

export function planSceneBeats(durationFrames: number, options: BeatPlanOptions): SceneBeat[] {
  const fps = Math.max(1, options.fps);
  const total = Math.max(1, Math.round(durationFrames));
  const target = Math.max(0.8, options.targetSeconds ?? 2.6) * fps;
  const minLength = Math.max(0.5, options.minSeconds ?? 1.6) * fps;
  const count = Math.max(1, Math.min(Math.round(total / target), Math.floor(total / minLength)));
  const imageCount = Math.max(1, Math.floor(options.imageCount ?? 1));
  const seed = hashText(String(options.seed ?? 'vetor'));

  // Order of preference after the opening hero shot: the spec callout first (it lands
  // while the number is being spoken), then the B-roll cutaway, a gallery photo and a macro.
  const extras: BeatKind[] = [];
  if (options.hasMetric) extras.push('callout');
  if (options.hasBroll) extras.push('broll');
  if (imageCount > 1) extras.push('gallery');
  extras.push('detail');
  const filler: BeatKind[] = imageCount > 1 ? ['detail', 'gallery', 'hero'] : ['detail', 'hero'];

  const kinds: BeatKind[] = ['hero'];
  for (let index = 1; index < count; index += 1) {
    const slot = index - 1;
    let kind: BeatKind = slot < extras.length ? extras[slot] : filler[(slot - extras.length) % filler.length];
    if (kind === kinds[index - 1]) {
      kind = filler.find((candidate) => candidate !== kinds[index - 1]) ?? 'hero';
    }
    kinds.push(kind);
  }

  return kinds.map((kind, index) => {
    const focus = FOCUS_POINTS[(seed + index) % FOCUS_POINTS.length];
    return {
      startFrame: Math.round((index * total) / count),
      endFrame: Math.round(((index + 1) * total) / count),
      kind,
      imageIndex: kind === 'gallery' && imageCount > 1 ? 1 + ((seed + index) % (imageCount - 1)) : 0,
      focusX: focus[0],
      focusY: focus[1],
    };
  });
}
