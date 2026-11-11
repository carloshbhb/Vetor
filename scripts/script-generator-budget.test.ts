import assert from "node:assert/strict";
import { getVideoScriptGenerationBudget } from "../src/lib/script-generator";
import { isValidComparisonVideoScriptResponse } from "../src/lib/script-generator";

const budget = getVideoScriptGenerationBudget();
assert.equal(budget.deadlineMs, 195_000);
assert.equal(budget.maxOpenRouterModels, 2);
assert.equal(budget.maxAttemptsPerModel, 1);
assert.equal(budget.providerTimeouts.openrouter, 25_000);
assert.equal(budget.providerTimeouts.groq, 25_000);
assert.equal(budget.providerTimeouts.nvidia, 105_000);
assert.ok(
  budget.deadlineMs < 240_000 && budget.deadlineMs > 120_000,
  "the bounded OpenRouter, Groq and NVIDIA fallbacks must fit inside the 240-second Vercel route limit"
);

const product1 = "Samsung Galaxy A56";
const product2 = "Samsung Galaxy A57";
const safeComparisonResponse = JSON.stringify({
  hook: "Samsung Galaxy A56 ou Samsung Galaxy A57: quais pontos você precisa conferir antes de decidir?",
  scenes: Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    type: index % 2 === 0 ? "product1" : "comparison",
    text: [
      "Compare a versão exata anunciada e confira se os nomes correspondem aos modelos que você procura.",
      "Consulte a ficha oficial dos dois aparelhos antes de considerar qualquer diferença de hardware ou software.",
      "Verifique quais recursos realmente importam para seus aplicativos, rotina de trabalho, estudo e entretenimento.",
      "Compare garantia, atualizações, assistência e conteúdo da embalagem em condições equivalentes.",
      "Confira preço final, frete e disponibilidade nos anúncios, sem presumir que o modelo novo sempre compensa.",
      "Escolha depois de confirmar os dados oficiais e priorizar o que faz diferença no seu uso.",
    ][index],
    duration: 9,
    visualCue: "Quadro visual distinto " + (index + 1),
    brollKeywords: ["smartphone comparison", "official product details"],
  })),
  callToAction: "Veja o comparativo completo e confira os dados oficiais antes de comprar.",
});
assert.equal(
  isValidComparisonVideoScriptResponse(safeComparisonResponse, product1, product2),
  true,
  "roteiro neutro baseado apenas nos nomes e na categoria deve passar"
);
const parsedSafe = JSON.parse(safeComparisonResponse);
const hallucinatedComparisonResponse = JSON.stringify({
  ...parsedSafe,
  scenes: parsedSafe.scenes.map((scene: any, index: number) => ({
    ...scene,
    text: index === 0 ? "O Galaxy A57 usa Exynos 1680 e tela AMOLED de 120Hz." : scene.text,
  })),
});
assert.equal(
  isValidComparisonVideoScriptResponse(hallucinatedComparisonResponse, product1, product2),
  false,
  "alegações técnicas sem dados fornecidos devem ser recusadas antes da aceitação"
);

console.log("script generator fallback budget tests passed");
