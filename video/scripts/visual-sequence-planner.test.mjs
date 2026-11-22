import assert from "node:assert/strict";
import { planVetorSceneMixes, classifyNarrativeBeat } from "./visual-sequence-planner.mjs";

const scenes = [
  { id: 1, text: "Veja o Redmi Pad 2 Pro em destaque", visualCue: "Revelação do produto" },
  { id: 2, text: "Tela de 12,1 polegadas e resolução 2,5K", visualCue: "Especificações" },
  { id: 3, text: "Bateria de 12.000 mAh", visualCue: "Autonomia" },
  { id: 4, text: "Assista, estude e trabalhe em qualquer lugar", visualCue: "Rotina e uso real" },
  { id: 5, text: "A tela é LCD, não AMOLED", visualCue: "Ponto de atenção" },
  { id: 6, text: "Confira o preço e compare alternativas", visualCue: "Preço e comparação" },
];

assert.equal(classifyNarrativeBeat(scenes[1]), "specification");
assert.equal(classifyNarrativeBeat(scenes[3]), "lifestyle");
assert.equal(classifyNarrativeBeat(scenes[4]), "tradeoff");
assert.equal(classifyNarrativeBeat({ text: "Tela grande e acabamento metálico", visualCue: "Detalhes externos" }), "detail");
assert.equal(classifyNarrativeBeat({ text: "Chip interno e arquitetura dos componentes", visualCue: "Desmontagem técnica" }), "teardown");

const plan = planVetorSceneMixes({
  scenes,
  title: "Redmi Pad 2 Pro",
  category: "Tablets",
  hasProductGallery: true,
  hasBroll: true,
});
assert.equal(plan.length, scenes.length);
assert.ok(plan.every((item) => item.templateIds.length >= 2));
assert.ok(plan.every((item) => item.visualLayers.length >= 6));
assert.ok(plan.some((item) => item.primaryTemplate === "hologram-hud"));
assert.ok(plan.some((item) => item.primaryTemplate === "lifestyle-demo"));
assert.ok(plan.some((item) => item.primaryTemplate === "kinetic-typography"));
assert.equal(plan[0].assets.realProductImage, true);
assert.equal(plan[3].assets.lifestyleFootage, true);

const aiDirected = planVetorSceneMixes({
  scenes: [{
    id: 99,
    text: "Tela com dados técnicos",
    visualIntent: "Orbit de câmera no produto com painéis holográficos",
    visualTemplates: ["hologram-hud", "premium-product-3d", "kinetic-typography"],
  }],
});
assert.equal(aiDirected[0].primaryTemplate, "hologram-hud");
assert.deepEqual(aiDirected[0].supportTemplates, ["premium-product-3d", "kinetic-typography"]);
assert.equal(aiDirected[0].directionSource, "ai-scene-direction");
assert.match(aiDirected[0].artDirection, /Orbit de câmera/);

const invalidAI = planVetorSceneMixes({
  scenes: [{ id: 100, text: "Cena comum", visualTemplates: ["invented-style", "hud"] }],
});
assert.equal(invalidAI[0].primaryTemplate, "cinematic-2d");
assert.equal(invalidAI[0].directionSource, "narrative-rules");

const manual = planVetorSceneMixes({ scenes, manualTemplateId: "editorial-luxury" });
assert.ok(manual.every((item) => item.primaryTemplate === "editorial-luxury"));
assert.ok(manual.every((item) => item.supportTemplates.length >= 1));

console.log("[visual-sequence-planner] semantic scene direction, mixed styles, manual override and asset-awareness passed.");
