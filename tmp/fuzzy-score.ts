/**
 * Fuzzy matching of a stored product_name against an ML search hit.
 * Pure functions, no I/O — kept in its own module so it can be unit-tested offline
 * against real ML responses (see tmp/fuzzy-cases.ts).
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words that indicate a different physical product rather than the product itself. */
const ACCESSORY_HINTS = [
  'teclado',
  'capa',
  'pelicula',
  'case',
  'carcaca',
  'mousepad',
  'adaptador',
  'carregador',
  'suporte',
  'pelicular',
  'folha',
  'toner',
  'cartucho',
  'pulseira',
  'protetor',
  'espuma',
  'bolsa',
  'mochila',
  'tripe',
  'extensor',
  'antena',
  'cabo',
  // accessories that inherit the full product name in the listing title
  'mesh',
  'band',
  'strap',
  'bracelete',
  'alca',
  'antiperda',
  'dock',
  'stand',
  'holder',
  'base',
  'film',
  'glass',
  'protetivo',
  'temperado',
  'reposicao',
  'temperado',
  'protetivo',
];

/** Tier/variant markers. Compared as whole tokens: "series" must not read as "se". */
const VARIANT_WORDS = [
  'pro',
  'max',
  'plus',
  'ultra',
  'mini',
  'lite',
  'se',
  'air',
  'note',
  'fe',
  'xe',
  'titanium',
  'play',
  'kids',
  'infantil',
  'child',
];

/** Category/colour/cosmetic noise: never evidence either way. */
const FILLER = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'com',
  'para',
  'sem',
  'e',
  'novo',
  'nova',
  'original',
  'importado',
  'imports',
  'black',
  'branco',
  'preto',
  'cinza',
  'azul',
  'vermelho',
  'verde',
  'g',
  'gb',
  'tb',
  'mb',
  'polo',
  'pol',
  'unidade',
  'kit',
  'pack',
  'smartphone',
  'smart',
  'telefone',
  'celular',
  'notebook',
  'computador',
  'fone',
  'ouvido',
  'controle',
  'control',
  'camera',
  'cameras',
  'monitor',
  'tela',
  'colorido',
  'cor',
  '4g',
  '5g',
  'wifi',
  'bluetooth',
  'resolucao',
  'dual',
  'sim',
  // colours never identify a model
  'nude',
  'rosa',
  'rose',
  'gold',
  'dourado',
  'prata',
  'silver',
  'graphite',
  'grafite',
  'red',
  'pink',
  'roxo',
  'purple',
  'amarelo',
  'yellow',
  'laranja',
  'orange',
  'champagne',
  'midnight',
  'starlight',
  'cosmic',
  'ivory',
  'pearl',
  'bege',
  // units spelled out
  'litros',
  'litro',
  'polegadas',
  'polegada',
  'poleg',
  // generic house brands
  'positivo',
  'inteligente',
  'smart',
]);


/**
 * "256gb" is also satisfied by "256", so capacity written with or without a
 * space compares equal. Letters-first codes ("m3", "g67") are not split.
 */
function expand(token: string): string[] {
  const m = token.match(/^(\d+(?:\.\d+)?)([a-z]{1,3})$/);
  if (m) return [token, m[1], m[2]];
  const m2 = token.match(/^([a-z]{1,4})(\d{1,4})$/);
  if (m2) return [token, m2[2]];
  return [token];
}

const RE_NUM = /^\d+(?:\.\d+)?$/;
const RE_CAP = /^\d+(?:\.\d+)?[a-z]{1,3}$/; // 256gb, 55l, 40mm
const RE_MODEL = /^[a-z]{1,4}\d{1,4}$/; // s25, g67, m3, 2c

interface Parts {
  words: string[];
  model: string[];
  cap: string[];
  nums: string[];
}

/**
 * Internal abbreviations used in our own product_name column that ML never writes
 * out. Mapped to the FILLER token they mean, so both sides collapse to the same
 * thing ("TP-Link Tapo C210 Cam Seg" vs "Câmera de segurança TP-Link Tapo C210").
 */
const SYNONYMS: Record<string, string> = {
  cam: 'camera',
  seg: 'seguranca',
  cftv: 'camera',
  mq: 'gb',
  hd: 'fullhd',
};

function split(s: string): Parts {
  const toks = normalize(s)
    .split(' ')
    .map((t) => SYNONYMS[t] || t)
    .filter((t) => t && !FILLER.has(t));
  const words: string[] = [];
  const model: string[] = [];
  const cap: string[] = [];
  const nums: string[] = [];
  for (const tok of toks) {
    if (RE_NUM.test(tok)) nums.push(tok);
    else if (RE_CAP.test(tok)) cap.push(tok);
    else if (RE_MODEL.test(tok)) model.push(tok);
    else words.push(tok);
  }
  return {
    words: [...new Set(words)],
    model: [...new Set(model)],
    cap: [...new Set(cap)],
    nums: [...new Set(nums)],
  };
}

/** Every token of a Parts, for cross-category matching. */
const allTokens = (p: Parts): string[] => [...p.words, ...p.model, ...p.cap, ...p.nums];

/** Numeric payload of a token: "55l" -> 55, "s25" -> 25, "gb" -> none. */
function numOf(token: string): string | null {
  const m = token.match(/\d+(?:\.\d+)?/);
  return m ? m[0] : null;
}

/**
 * Two tokens match when their spellings intersect. Comparison is symmetric so a
 * stored "256gb" matches a listed "256" and a stored "10" matches a listed "10a".
 * When both tokens carry a number the numbers must agree, so the shared unit in
 * "55l" vs "5.5L" cannot make a 55-litre fryer match a 5.5-litre one.
 */
function intersects(a: string, b: string): boolean {
  const na = numOf(a);
  const nb = numOf(b);
  if (na !== nb) return false;
  if (na === null) return a === b;
  const ea = new Set(expand(a).filter((v) => numOf(v) === na));
  return expand(b).some((v) => numOf(v) === na && ea.has(v));
}

function satisfied(token: string, other: Parts): boolean {
  return allTokens(other).some((u) => intersects(token, u));
}

const ratio = (need: string[], other: Parts) =>
  need.length ? need.filter((t) => satisfied(t, other)).length / need.length : 1;

/**
 * Score 0..1 for how likely `mlName` is the same product as `dbName`.
 *
 * Four signals, weighted by how strongly each one identifies a product:
 *  - words ("galaxy", "watch")  — the vocabulary     0.40
 *  - model ("s25", "g67", "m3") — the model code     0.40
 *  - cap   ("256gb", "40mm")    — the specification  0.20
 *  - nums  ("17", "7", "40")    — generation/size
 *
 * A *contradicted* number is disqualifying. A merely *absent* specification
 * ("S25 Ultra 256GB" listed as "Samsung Galaxy S25 Ultra") is tolerated, because
 * ML titles routinely omit it — but only once the model code has matched, so
 * "Freebuds 6" vs "Freebuds Neo" still scores low.
 */
export function fuzzyScore(dbName: string, mlName: string): number {
  const a = split(dbName);
  const b = split(mlName);
  if (!a.words.length && !a.model.length && !a.cap.length && !a.nums.length) return 0;

  const wordScore = ratio(a.words, b);
  const modelScore = ratio(a.model, b);
  const capScoreRaw = ratio(a.cap, b);

  const matchedNums = a.nums.filter((n) => satisfied(n, b));
  const missingNums = a.nums.length - matchedNums.length;

  const modelAnchored = a.model.length > 0 && modelScore === 1;
  const numScore =
    !a.nums.length || missingNums === 0 || modelAnchored
      ? 1
      : matchedNums.length / a.nums.length;

  // once the model code is pinned, a missing capacity ("S25 Ultra 256GB" listed
  // as "Galaxy S25 Ultra") is redundant noise rather than a contradiction
  const capScore = a.cap.length && capScoreRaw < 1 && modelAnchored ? 1 : capScoreRaw;

  let score = (wordScore * 0.4 + modelScore * 0.4 + capScore * 0.2) * 0.75 + numScore * 0.25;

  if (a.model.length && modelScore < 1) score *= 0.6;
  if (a.nums.length && numScore < 1) score *= 0.3;
  if (a.cap.length && capScore < 1) score *= 0.75;

  // A missing word is graded by how much it could have distinguished the product:
  // "watch" missing means ML listed a smartphone, while a missing 3-letter house
  // code ("AFO") is noise we should not reject a good match over.
  const missingWords = a.words.filter((w) => !satisfied(w, b));
  if (missingWords.length) {
    const strongMisses = missingWords.filter((w) => w.length >= 4).length;
    if (strongMisses >= 2) score *= 0.4;
    else if (strongMisses === 1) score *= 0.6;
    else score *= 0.9;
  }

  const aTokens = new Set(normalize(dbName).split(' '));
  const bTokens = new Set(normalize(mlName).split(' '));

  const variantA = VARIANT_WORDS.filter((w) => aTokens.has(w));
  const variantB = VARIANT_WORDS.filter((w) => bTokens.has(w));
  if (variantA.some((w) => !variantB.includes(w)) || variantB.some((w) => !variantA.includes(w))) {
    score *= 0.5;
  }

  if (!aTokens.has('kit') && bTokens.has('kit')) score *= 0.7;
  if (aTokens.has('kit') && !bTokens.has('kit')) score *= 0.85;

  if (ACCESSORY_HINTS.some((h) => bTokens.has(h) && !aTokens.has(h))) score *= 0.45;

  return Math.max(0, Math.min(1, score));
}
