import assert from "node:assert/strict";
import { buildScriptPrompt, ensureSceneVisualDirections, isLongSpokenWordBudgetValid, isShortSpokenWordBudgetValid, toSpokenProductName } from "../src/lib/script-generator";
import type { ProductInfo } from "../src/lib/script-generator";

const spokenName = toSpokenProductName(
  "Smart TV TCL 50 Polegadas QLED 4K P7K WiFi Bluetooth Google TV HDR10+ Dolby Atmos Dolby Vision 50P7K",
);
assert.equal(spokenName, "Smart TV TCL 50 Polegadas QLED 4K P7K", "spoken product name removes repetitive listing features");

const validShortBudget = {
  hook: "Antes de comprar, há detalhes que merecem atenção.",
  scenes: [
    "Compare os pontos confirmados com sua rotina antes de escolher; capacidade, espaço disponível e tipo de preparo mudam a experiência diária.",
    "Confira a potência informada na ficha oficial e confirme se a instalação elétrica da sua casa suporta o modelo com segurança.",
    "O tamanho do cesto deve combinar com as porções que você prepara, sem ocupar mais espaço na bancada do que pode reservar.",
    "Observe os controles, timer e temperatura disponíveis; confirme esses detalhes no anúncio, porque as versões podem variar conforme a voltagem.",
    "A limpeza depende do revestimento e das orientações do fabricante; prefira materiais macios e siga as instruções para preservar o cesto.",
    "Compare preço final, frete, garantia e avaliações recentes com modelos equivalentes antes de decidir se os recursos justificam o investimento.",
    "A melhor escolha depende da sua voltagem, do espaço disponível e da frequência de uso, não apenas do acabamento externo.",
  ].map((text) => ({ text })),
  callToAction: "Confira a ficha completa e as condições atuais no link da descrição antes de decidir.",
};
assert.equal(isShortSpokenWordBudgetValid(validShortBudget), true, "Short narration is long enough to reach at least 60 seconds at the configured Edge TTS rate");
assert.equal(isShortSpokenWordBudgetValid({
  ...validShortBudget,
  scenes: validShortBudget.scenes.slice(0, 6),
}), false, "Shorts require seven distinct scenes");
assert.equal(isShortSpokenWordBudgetValid({
  ...validShortBudget,
  scenes: Array.from({ length: 7 }, () => ({ text: "palavra ".repeat(25) })),
}), false, "overlong Shorts scripts are rejected before TTS");
assert.equal(isShortSpokenWordBudgetValid({
  ...validShortBudget,
  scenes: Array.from({ length: 7 }, () => ({ text: "curto demais para sustentar uma locução com duração mínima sem espaços vazios." })),
}), false, "underwritten Shorts scripts are rejected before TTS");

const validLongBudget = {
  hook: "Antes de decidir, entenda os pontos que realmente importam para o seu uso diário.",
  scenes: Array.from({ length: 8 }, (_, sceneIndex) => ({
    text: Array.from({ length: 80 }, (_, wordIndex) => "informacao" + sceneIndex + "_" + wordIndex).join(" "),
  })),
  callToAction: "Confira os detalhes do produto, a análise completa e as condições atuais no link da descrição.",
};
assert.equal(isLongSpokenWordBudgetValid(validLongBudget), true, "long videos require enough spoken words for 4–7 minutes");
assert.equal(isLongSpokenWordBudgetValid({
  ...validLongBudget,
  scenes: Array.from({ length: 8 }, () => ({ text: "curto ".repeat(40) })),
}), false, "underwritten long scripts are rejected before TTS");
assert.equal(isLongSpokenWordBudgetValid({
  ...validLongBudget,
  scenes: Array.from({ length: 8 }, () => ({ text: "longo ".repeat(120) })),
}), false, "overlong long scripts are rejected before TTS");

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
const fallbackScene = fallbackDirection[0];
assert.ok(fallbackScene);
assert.equal(fallbackScene.visualTemplates[0], "hologram-hud");
assert.ok(fallbackScene.visualTemplates.length >= 2);
assert.match(fallbackScene.visualIntent, /HUD|dado confirmado/i);

const invalidDirection = ensureSceneVisualDirections([{
  id: 3,
  text: "Uso para estudo e trabalho",
  visualCue: "Rotina",
  visualTemplates: ["invented-template", "also-invalid"] as any,
}]);
const invalidScene = invalidDirection[0];
assert.ok(invalidScene);
assert.equal(invalidScene.visualTemplates[0], "lifestyle-demo");
assert.equal(invalidScene.visualTemplates.length, 3);

const comparisonFallback = ensureSceneVisualDirections([
  { id: 4, type: "product1", text: "Confira a tela e o acabamento externo.", visualCue: "Detalhes do primeiro produto" },
  { id: 5, type: "product2", text: "Veja a bateria e autonomia confirmadas.", visualCue: "Autonomia do segundo produto" },
  { id: 6, type: "comparison", text: "Compare os critérios e avalie o que importa para seu uso.", visualCue: "Critérios lado a lado" },
], { comparison: true });
const comparisonDetail = comparisonFallback[0]!;
const comparisonSpecs = comparisonFallback[1]!;
const comparisonArena = comparisonFallback[2]!;
assert.equal(comparisonDetail.visualTemplates[0], "premium-product-3d");
assert.equal(comparisonSpecs.visualTemplates[0], "hologram-hud");
assert.equal(comparisonArena.visualTemplates[0], "comparison-arena");

const withoutBrief = buildScriptPrompt(baseProduct);
assert.ok(withoutBrief.includes("PESQUISA SERP + YOUTUBE"), "prompt deve conter seção de pesquisa");
assert.ok(withoutBrief.includes("Não disponível."), "prompt sem brief deve indicar indisponível");
assert.ok(withoutBrief.includes("18–22 palavras faladas por cena"), "Short prompt is sized for measured Edge TTS duration");
assert.ok(withoutBrief.includes("entre 155 e 190 palavras"), "Short prompt explicitly limits total narration length for at least 60 seconds");
assert.ok(withoutBrief.includes("exatamente 7 cenas"), "Short prompt fixes scene count for reliable timing");
const longWithoutBrief = buildScriptPrompt({ ...baseProduct, videoFormat: "long" });
assert.ok(longWithoutBrief.includes("entre 640 e 1.120 palavras"), "long prompt explicitly targets 4–7 minutes of spoken narration");
assert.ok(longWithoutBrief.includes("70–100 palavras por cena"), "long scene lengths support natural narration pacing");

console.log("script generator research brief tests passed");