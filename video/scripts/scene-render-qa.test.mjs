import assert from "node:assert/strict";
import { planVetorSceneMixes } from "./visual-sequence-planner.mjs";
import { evaluateSceneRenderPlans, assertSceneRenderPlans } from "./visual-render-qa.mjs";

const scenes = [
  { id: 1, text: "Revelação da garrafa térmica Nórdica", visualCue: "Hero reveal", visualTemplates: ["premium-product-3d", "kinetic-typography"] },
  { id: 2, text: "O corpo canelado e o aro dourado aparecem no acabamento", visualCue: "Macro do acabamento", visualTemplates: ["premium-product-3d", "editorial-luxury"] },
  { id: 3, text: "A ampola interna de vidro ajuda a conservar o café", visualCue: "Estrutura interna", visualTemplates: ["exploded-teardown", "hologram-hud"] },
  { id: 4, text: "Na cozinha ou recebendo visitas, ela acompanha a rotina", visualCue: "Uso cotidiano", visualTemplates: ["lifestyle-demo", "cinematic-2d"] },
  { id: 5, text: "Até seis horas de conservação conforme o anúncio", visualCue: "Dado de desempenho", visualTemplates: ["hologram-hud", "data-storytelling"] },
  { id: 6, text: "Um litro de capacidade e design para a mesa", visualCue: "Veredito", visualTemplates: ["editorial-luxury", "kinetic-typography"] },
];

const plans = planVetorSceneMixes({
  scenes,
  title: "Garrafa Térmica Nórdica para Café 1L",
  category: "Casa e utilidades",
  hasBroll: true,
});

const qa = assertSceneRenderPlans(plans);
assert.equal(qa.ok, true);
assert.ok(qa.rendererCounts["three-product"] >= 1, "thermal carafe must use a real 3D scene");
assert.ok(qa.rendererCounts["cinematic-footage"] >= 1, "matched lifestyle footage must use immersive footage renderer");
assert.ok(plans.every((scene) => scene.renderPlan.cameraMove), "every scene must define a camera move");
assert.ok(plans.every((scene, index) => index === 0 || scene.renderPlan.cameraMove !== plans[index - 1].renderPlan.cameraMove), "consecutive scenes must not repeat camera moves");
assert.equal(plans[0].renderPlan.productProfile, "thermal-carafe");

const unknownProduct = planVetorSceneMixes({
  scenes: [{ id: 1, text: "Acabamento e design", visualCue: "Detalhe externo", visualTemplates: ["premium-product-3d"] }],
  title: "Produto sem categoria identificada",
  category: "Outros",
});
assert.equal(unknownProduct[0].renderPlan.renderer, "layered-2d");
assert.equal(unknownProduct[0].renderPlan.usesTrueProductGeometry, false);
assert.match(unknownProduct[0].renderPlan.fallbackReason, /2.5D/);

const lifestyleWithoutFootage = planVetorSceneMixes({
  scenes: [{ id: 1, text: "Na cozinha, acompanha sua rotina", visualCue: "Uso cotidiano", visualTemplates: ["lifestyle-demo"] }],
  title: "Garrafa Térmica",
  category: "Casa",
  hasBroll: false,
});
assert.equal(lifestyleWithoutFootage[0].renderPlan.renderer, "layered-2d");
assert.match(lifestyleWithoutFootage[0].renderPlan.fallbackReason, /sem simular uma demonstração real/);

const perSceneFootage = planVetorSceneMixes({
  scenes: [
    { id: 1, text: "Na cozinha, acompanha sua rotina", visualCue: "Uso cotidiano", visualTemplates: ["lifestyle-demo"] },
    { id: 2, text: "No escritório, acompanha sua rotina", visualCue: "Uso cotidiano", visualTemplates: ["lifestyle-demo"] },
  ],
  title: "Garrafa Térmica",
  category: "Casa",
  hasBroll: [false, true],
});
assert.equal(perSceneFootage[0].renderPlan.renderer, "layered-2d");
assert.equal(perSceneFootage[0].renderPlan.hasMatchedBroll, false);
assert.equal(perSceneFootage[1].renderPlan.renderer, "cinematic-footage");
assert.equal(perSceneFootage[1].renderPlan.hasMatchedBroll, true);

const glbProduct = planVetorSceneMixes({
  scenes: [{ id: 1, text: "Design premium", visualCue: "Hero", visualTemplates: ["premium-product-3d"] }],
  title: "Produto especial",
  category: "Casa",
  verified3DModel: {
    verified: true,
    integrityVerified: true,
    url: "https://storage.example.com/product.glb",
    sha256: "a".repeat(64),
    verifiedBy: "Vetor QA",
    verifiedAt: "2026-11-23T12:00:00.000Z",
    sourceReferences: ["https://merchant.example.com/product"],
  },
});
assert.equal(glbProduct[0].renderPlan.productRepresentation, "verified-gltf-model");
assert.equal(glbProduct[0].renderPlan.visualFidelity, "verified-3d-asset");
assert.equal(glbProduct[0].renderPlan.usesTrueProductGeometry, true);
assert.equal(glbProduct[0].renderPlan.modelAssetIntegrityVerified, true);
assert.equal(assertSceneRenderPlans(glbProduct).ok, true);

const unverifiedGlb = planVetorSceneMixes({
  scenes: [{ id: 1, text: "Design premium", visualCue: "Hero", visualTemplates: ["premium-product-3d"] }],
  title: "Garrafa Térmica Nórdica 1L",
  category: "Casa",
  hasUnverified3DModel: true,
});
assert.equal(unverifiedGlb[0].renderPlan.visualFidelity, "illustrative-parametric-3d");
assert.equal(unverifiedGlb[0].renderPlan.usesTrueProductGeometry, false);
assert.equal(unverifiedGlb[0].renderPlan.modelAssetStatus, "unverified");
assert.match(unverifiedGlb[0].renderPlan.fallbackReason, /ilustrativo/);
assert.equal(assertSceneRenderPlans(unverifiedGlb).ok, true);

const forged = plans.map((scene) => ({
  ...scene,
  renderPlan: {
    ...scene.renderPlan,
    usesTrueProductGeometry: true,
    visualFidelity: "illustrative-parametric-3d",
  },
}));
assert.equal(evaluateSceneRenderPlans(forged).ok, false);

const invalid = plans.map((scene) => ({ ...scene, renderPlan: { ...scene.renderPlan, cameraMove: "" } }));
assert.equal(evaluateSceneRenderPlans(invalid).ok, false);

const duplicateIds = [
  { ...plans[0], sceneId: "duplicate" },
  { ...plans[1], sceneId: "duplicate" },
];
assert.equal(evaluateSceneRenderPlans(duplicateIds).ok, false);

const unsupportedRenderer = [{
  ...plans[0],
  renderPlan: { ...plans[0].renderPlan, renderer: "imaginary-engine" },
}];
assert.equal(evaluateSceneRenderPlans(unsupportedRenderer).ok, false);

console.log("[scene-render-qa] true 3D manifest, illustrative fallback honesty, B-roll, scene identity and visual variety passed.");
