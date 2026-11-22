import assert from "node:assert/strict";
import {
  VETOR_VISUAL_TEMPLATES,
  listVetorVisualTemplates,
  normalizeVetorTemplateId,
  resolveVetorVisualTemplate,
} from "./visual-template-registry.mjs";

assert.equal(VETOR_VISUAL_TEMPLATES.length, 10);
assert.equal(listVetorVisualTemplates().length, 10);
assert.equal(normalizeVetorTemplateId("Premium 3D"), "premium-product-3d");
assert.equal(normalizeVetorTemplateId("HUD"), "hologram-hud");

const comparison = resolveVetorVisualTemplate({
  videoData: { title: "Galaxy S24 vs iPhone 15", category: "Smartphones" },
});
assert.equal(comparison.id, "comparison-arena");
assert.equal(comparison.selection, "automatic");

const explicit = resolveVetorVisualTemplate({
  mediaAssets: [{ type: "visual_template", templateId: "exploded-teardown" }],
  videoData: { title: "Notebook gamer", category: "Notebooks" },
});
assert.equal(explicit.id, "exploded-teardown");
assert.equal(explicit.selection, "manual");

const wearable = resolveVetorVisualTemplate({
  videoData: { title: "Galaxy Fit3", category: "Wearables", scenes: [{ text: "Até 13 dias de bateria", visualCue: "Autonomia" }] },
});
assert.ok(["hologram-hud", "premium-product-3d", "data-storytelling"].includes(wearable.id));
assert.equal(VETOR_VISUAL_TEMPLATES.every((item) => item.renderer === "remotion"), true);

console.log("[visual-template-registry] 10 templates, aliases, manual selection and automatic routing passed.");
