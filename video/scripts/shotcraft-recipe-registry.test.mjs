import assert from "node:assert/strict";
import {
  SHOTCRAFT_RECIPES,
  normalizeShotcraftRecipeId,
  selectShotcraftRecipe,
} from "./shotcraft-recipe-registry.mjs";

assert.equal(Object.keys(SHOTCRAFT_RECIPES).length, 7);
assert.equal(normalizeShotcraftRecipeId("SCANLINE_ANNOTATE_FOCUS"), "scanline-annotate-focus");
assert.equal(normalizeShotcraftRecipeId("not-a-real-recipe"), null);

assert.equal(selectShotcraftRecipe({ beat: "hook" }).id, "spotlight-hero-card");
assert.equal(selectShotcraftRecipe({ beat: "price-check" }).id, "product-card-progressive-assemble");
assert.equal(selectShotcraftRecipe({ beat: "specification" }).id, "scanline-annotate-focus");

const varied = selectShotcraftRecipe({ beat: "hook", previousRecipeId: "spotlight-hero-card" });
assert.equal(varied.id, "flying-words");
assert.equal(varied.selection, "narrative-auto");

const manual = selectShotcraftRecipe({
  beat: "hook",
  manualRecipeId: "light-play-moves",
  previousRecipeId: "light-play-moves",
});
assert.equal(manual.id, "light-play-moves");
assert.equal(manual.selection, "manual");

const sceneManual = selectShotcraftRecipe({
  beat: "detail",
  sceneRecipeId: "chart-live-moves",
  manualRecipeId: "spotlight-hero-card",
});
assert.equal(sceneManual.id, "chart-live-moves");
assert.equal(sceneManual.selection, "scene-manual");

const invalidOverrideFallsBack = selectShotcraftRecipe({
  beat: "comparison",
  manualRecipeId: "made-up-recipe",
});
assert.equal(invalidOverrideFallsBack.id, "beat-cut-moves");
assert.equal(invalidOverrideFallsBack.selection, "narrative-auto");

console.log("[shotcraft-recipe-registry] defaults, anti-repetition, manual override and validation passed.");
