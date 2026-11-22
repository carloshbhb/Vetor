import assert from "node:assert/strict";
import { buildScriptPrompt, ensureSceneVisualDirections } from "../src/lib/script-generator";
import type { ProductInfo } from "../src/lib/script-generator";

const baseProduct: ProductInfo = {
  title: "Fone Bluetooth X",
  category: "Áudio",
  price: "R$ 199",
  marketplace: "Mercado Livre",
};

const withBrief = buildScriptPrompt({ ...baseProduct, researchBrief: "SERP mostra review do concorrente com 2M views." });
assert.ok(withBrief.includes("PESQUISA SERP + YOUTUBE"), "prompt deve conter seção de pesquisa");
assert.ok(withBrief.includes("SERP mostra review do concorrente com 2M views."), "prompt deve conter texto do brief");
assert.ok(withBrief.includes("DIREÇÃO CRIATIVA POR CENA"), "prompt deve orientar a IA a dirigir cada cena");
assert.ok(withBrief.includes("visualTemplates"), "prompt deve pedir as combinações de templates");
assert.ok(withBrief.includes("exploded-teardown"), "prompt deve incluir o catálogo visual permitido");

const aiDirection = ensureSceneVisualDirections([{
  id: 1,
  text: "Tela com dados técnicos",
  visualCue: "Especificações",
  visualIntent: "Câmera orbital com painel holográfico",
  visualTemplates: ["hologram-hud", "premium-product-3d"],
}]);
assert.deepEqual(aiDirection[0].visualTemplates, ["hologram-hud", "premium-product-3d"]);
assert.equal(aiDirection[0].visualIntent, "Câmera orbital com painel holográfico");

const fallbackDirection = ensureSceneVisualDirections([{
  id: 2,
  text: "Bateria de 12.000 mAh",
  visualCue: "Autonomia",
}]);
assert.equal(fallbackDirection[0].visualTemplates[0], "hologram-hud");
assert.ok(fallbackDirection[0].visualTemplates.length >= 2);
assert.match(fallbackDirection[0].visualIntent, /HUD|dado confirmado/i);

const invalidDirection = ensureSceneVisualDirections([{
  id: 3,
  text: "Uso para estudo e trabalho",
  visualCue: "Rotina",
  visualTemplates: ["invented-template", "also-invalid"],
}]);
assert.equal(invalidDirection[0].visualTemplates[0], "lifestyle-demo");
assert.equal(invalidDirection[0].visualTemplates.length, 3);

const comparisonFallback = ensureSceneVisualDirections([
  { id: 4, type: "product1", text: "Confira a tela e o acabamento externo.", visualCue: "Detalhes do primeiro produto" },
  { id: 5, type: "product2", text: "Veja a bateria e autonomia confirmadas.", visualCue: "Autonomia do segundo produto" },
  { id: 6, type: "comparison", text: "Compare os critérios e avalie o que importa para seu uso.", visualCue: "Critérios lado a lado" },
], { comparison: true });
assert.equal(comparisonFallback[0].visualTemplates[0], "premium-product-3d");
assert.equal(comparisonFallback[1].visualTemplates[0], "hologram-hud");
assert.equal(comparisonFallback[2].visualTemplates[0], "comparison-arena");

const withoutBrief = buildScriptPrompt(baseProduct);
assert.ok(withoutBrief.includes("PESQUISA SERP + YOUTUBE"), "prompt deve conter seção de pesquisa");
assert.ok(withoutBrief.includes("Não disponível."), "prompt sem brief deve indicar indisponível");

console.log("script generator research brief tests passed");