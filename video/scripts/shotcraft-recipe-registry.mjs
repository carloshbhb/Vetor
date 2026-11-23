/**
 * Curated, independently implemented adaptations of selected video-shotcraft
 * shot recipes. Remotion remains the renderer; this registry only directs
 * scene-level motion treatments.
 *
 * Upstream inspiration: https://github.com/Vincentwei1021/video-shotcraft
 * Vetor implementations are authored here and do not copy upstream demos.
 */
export const SHOTCRAFT_SOURCE = "https://github.com/Vincentwei1021/video-shotcraft";

export const SHOTCRAFT_RECIPES = Object.freeze({
  "spotlight-hero-card": Object.freeze({
    id: "spotlight-hero-card",
    category: "opening-brand",
    purpose: "Reveal the real product as the scene's visual protagonist.",
    component: "spotlight",
  }),
  "product-card-progressive-assemble": Object.freeze({
    id: "product-card-progressive-assemble",
    category: "ui-entrance",
    purpose: "Assemble a compact product fact plate from verified scene copy.",
    component: "progressive-card",
  }),
  "scanline-annotate-focus": Object.freeze({
    id: "scanline-annotate-focus",
    category: "light-emphasis",
    purpose: "Guide attention to a detail without inventing product components.",
    component: "scanline",
  }),
  "chart-live-moves": Object.freeze({
    id: "chart-live-moves",
    category: "data",
    purpose: "Present a supplied metric with an animated data frame.",
    component: "metric-frame",
  }),
  "beat-cut-moves": Object.freeze({
    id: "beat-cut-moves",
    category: "rhythm",
    purpose: "Add restrained rhythmic accents at scene boundaries.",
    component: "rhythmic-accents",
  }),
  "flying-words": Object.freeze({
    id: "flying-words",
    category: "typography",
    purpose: "Turn a short, source-grounded phrase into a kinetic hook.",
    component: "flying-words",
  }),
  "light-play-moves": Object.freeze({
    id: "light-play-moves",
    category: "light-emphasis",
    purpose: "Add a restrained moving light sweep to a hero or verdict.",
    component: "light-sweep",
  }),
});

const DEFAULTS = Object.freeze({
  hook: ["spotlight-hero-card", "flying-words"],
  "price-check": ["product-card-progressive-assemble", "chart-live-moves"],
  tradeoff: ["flying-words", "scanline-annotate-focus"],
  comparison: ["beat-cut-moves", "chart-live-moves"],
  specification: ["scanline-annotate-focus", "chart-live-moves"],
  teardown: ["scanline-annotate-focus", "spotlight-hero-card"],
  detail: ["scanline-annotate-focus", "light-play-moves"],
  lifestyle: ["spotlight-hero-card", "light-play-moves"],
  verdict: ["light-play-moves", "product-card-progressive-assemble"],
  feature: ["scanline-annotate-focus", "spotlight-hero-card"],
});

export function normalizeShotcraftRecipeId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  return Object.prototype.hasOwnProperty.call(SHOTCRAFT_RECIPES, normalized)
    ? normalized
    : null;
}

/**
 * Scene override wins over video-level override; otherwise choose by narrative
 * beat. Automatic selection rotates away from the immediately previous recipe.
 * Explicit manual choices are never silently changed.
 */
export function selectShotcraftRecipe({
  beat = "feature",
  sceneRecipeId = null,
  manualRecipeId = null,
  previousRecipeId = null,
} = {}) {
  const sceneOverride = normalizeShotcraftRecipeId(sceneRecipeId);
  if (sceneOverride) {
    return { ...SHOTCRAFT_RECIPES[sceneOverride], selection: "scene-manual" };
  }

  const manualOverride = normalizeShotcraftRecipeId(manualRecipeId);
  if (manualOverride) {
    return { ...SHOTCRAFT_RECIPES[manualOverride], selection: "manual" };
  }

  const options = DEFAULTS[beat] || DEFAULTS.feature;
  const id = options.find((candidate) => candidate !== previousRecipeId) || options[0];
  return { ...SHOTCRAFT_RECIPES[id], selection: "narrative-auto" };
}
