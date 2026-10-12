import assert from "node:assert/strict";
import { getMercadoLivreCandidateMismatchReason } from "../src/lib/mercadolivre-search";

function mustReview(query: string, title: string, expectedReason: RegExp): void {
  const reason = getMercadoLivreCandidateMismatchReason(query, title);
  assert.ok(reason, `esperava bloqueio para: ${title}`);
  assert.match(reason, expectedReason);
}

function mustMatch(query: string, title: string): void {
  assert.equal(
    getMercadoLivreCandidateMismatchReason(query, title),
    null,
    `um anúncio da mesma variante não deveria ser bloqueado: ${title}`,
  );
}

mustReview(
  "HyperX Cloud Alpha headset gamer",
  "Almofadas ear cushions para HyperX Cloud Alpha",
  /espuma|almofada/i,
);
mustReview(
  "Xiaomi Robot Vacuum X10",
  "Mop pad compatível com Xiaomi Robot Vacuum X10",
  /mop|refil/i,
);
mustReview(
  "Lenovo IdeaPad Gaming 3 notebook",
  "Teclas avulsas para Lenovo IdeaPad Gaming 3",
  /tecla|keycap/i,
);
mustReview(
  "Intelbras EWS 100",
  "Central Intelbras EWS 1001",
  /modelo|número|numerad/i,
);
mustReview(
  "Samsung Galaxy Buds 4 Pro",
  "Samsung Galaxy Buds Pro",
  /modelo|número/i,
);
mustReview(
  "Xiaomi Redmi Watch 5",
  "Xiaomi Redmi Watch 5 Active",
  /active|variante/i,
);
mustReview(
  "Controle GameSir Nova Lite preto translúcido",
  "GameSir Nova Lite Hall Effect Bluetooth Switch PC Ash Grey",
  /cor|acabamento|preto|cinza/i,
);
mustReview(
  "Intelbras IM3C câmera de segurança",
  "Kit com 6 unidades de câmeras Intelbras IM3C",
  /kit|unidades|quantidade/i,
);
mustReview(
  "Motorola Moto G06 128GB",
  "Motorola Moto G06 64GB",
  /modelo|128gb/i,
);

mustMatch(
  "Samsung Galaxy Buds 4 Pro",
  "Samsung Galaxy Buds4 Pro fone sem fio",
);
mustMatch(
  "Xiaomi Redmi Watch 5 Active",
  "Xiaomi Redmi Watch 5 Active smartwatch",
);
mustMatch(
  "Intelbras EWS 100",
  "Intelbras EWS100 central de alarme",
);
mustMatch(
  "Controle GameSir Nova Lite",
  "GameSir Nova Lite Hall Effect Bluetooth Switch PC Ash Grey",
);

console.log("mercadolivre-search guardrails: all assertions passed");
