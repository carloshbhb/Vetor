import assert from "node:assert/strict";
import { scoreTrendProductRelevance } from "../src/lib/trend-product-relevance";

const newsTitlesForTravel = [
  "Aeronave de luxo de bilionário russo fica no aeroporto de Florianópolis",
  "Jato executivo mais rápido do mundo chama atenção",
];
const jbl = {
  productTitle: "Fone de Ouvido On-Ear JBL Tune 520BT Bluetooth",
  productCategory: "Áudio",
};

assert.ok(
  scoreTrendProductRelevance({
    topicTitle: "jato executivo",
    newsTitles: newsTitlesForTravel,
    ...jbl,
  }) >= 6,
  "a travel/aircraft headline can recommend a headphone through an explicit use-case alias",
);

assert.ok(
  scoreTrendProductRelevance({
    topicTitle: "Corinthians",
    newsTitles: ["Seedorf explica a posição de Breno Bidon no Corinthians"],
    productTitle: "Smart TV Samsung 50 polegadas 4K",
    productCategory: "Televisores",
  }) >= 6,
  "a football topic can recommend a television through an explicit viewing-use alias",
);

assert.equal(
  scoreTrendProductRelevance({
    topicTitle: "renda familiar",
    newsTitles: ["MEI no Bolsa Família: saiba quais são os critérios para receber o benefício"],
    productTitle: "Smartphone Samsung Galaxy A36 5G",
    productCategory: "Celulares",
  }),
  0,
  "a household-income policy story must not be paired with a generic smartphone",
);

assert.equal(
  scoreTrendProductRelevance({
    topicTitle: "Matheus Bidu",
    newsTitles: ["Fundo de tela do Corinthians: Matheus Bidu comemorando gol"],
    productTitle: "Tablet Samsung Galaxy Tab S10 FE 5G",
    productCategory: "Tablets",
  }),
  0,
  "a football player name must not be paired with an unrelated tablet",
);

assert.equal(
  scoreTrendProductRelevance({
    topicTitle: "Campinense",
    newsTitles: ["Campinense e Serra Branca disputam vaga na final da Copa Paraíba"],
    productTitle: "Câmera de segurança Ezviz C6 2K+ WiFi interna",
    productCategory: "Câmeras de segurança",
  }),
  0,
  "a football club headline must not be paired with a home security camera",
);

assert.equal(
  scoreTrendProductRelevance({
    topicTitle: "notícia até agora",
    newsTitles: ["Veja mais detalhes sobre o caso"],
    productTitle: "Fone JBL Tune 520BT",
    productCategory: "Áudio",
  }),
  0,
  "generic headline words cannot create an affiliate-product match",
);

console.log("trend-to-product semantic relevance tests passed");
