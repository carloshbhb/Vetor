import assert from "node:assert/strict";
import { buildScriptPrompt } from "../src/lib/script-generator";
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

const withoutBrief = buildScriptPrompt(baseProduct);
assert.ok(withoutBrief.includes("PESQUISA SERP + YOUTUBE"), "prompt deve conter seção de pesquisa");
assert.ok(withoutBrief.includes("Não disponível."), "prompt sem brief deve indicar indisponível");

console.log("script generator research brief tests passed");