import assert from "node:assert/strict";
import { normalizeReviewCompareRows } from "../src/lib/review-compare";

const cleanText = (value: unknown) =>
  String(value ?? "").replace(/bateria冠军级/gi, "bateria de nível excelente");

const legacyRows = normalizeReviewCompareRows([
  ["Preço (Estimado)", "R$ 1.199", "R$ 949"],
  ["Peso", "~60g", "~63g"],
  ["Sensor", "Logitech HERO 2 (32K DPI)", "Razer Focus Pro 30K (30K DPI)"],
  ["Conectividade", "LIGHTSPEED Wireless", "HyperSpeed Wireless"],
], cleanText);

assert.equal(legacyRows.length, 4);
assert.deepEqual(legacyRows[0], {
  feature: "Preço (Estimado)",
  values: ["R$ 1.199", "R$ 949"],
  winner: -1,
});
assert.equal(legacyRows[1].feature, "Peso");
assert.deepEqual(legacyRows[1].values, ["~60g", "~63g"]);
assert.equal(legacyRows[2].values.length, 2);

const currentRows = normalizeReviewCompareRows([
  { feature: "Bateria", values: ["bateria冠军级", "80 horas"], winner: 0 },
  { feature: "Software", values: ["G Hub", "Synapse"], winner: 1 },
], cleanText);

assert.deepEqual(currentRows, [
  { feature: "Bateria", values: ["bateria de nível excelente", "80 horas"], winner: 0 },
  { feature: "Software", values: ["G Hub", "Synapse"], winner: 1 },
]);
assert.deepEqual(normalizeReviewCompareRows(null, cleanText), []);

console.log("review-compare: all assertions passed");
