import assert from "node:assert/strict";
import {
  isAccessoryMatch,
  isSocialListSourceRef,
  SOCIAL_LIST_IMPORT_SOURCE_TYPE,
  SOCIAL_LIST_SOURCE_REF_PREFIX,
} from "../src/lib/mercadolivre-refill";

// Real cases observed in the 2026-11-04 refill dry run. The matcher gave these
// accessory listings a >= 0.9 score, so promotion must reject them explicitly.
const accessoryCases: Array<[string, string]> = [
  ["Samsung Galaxy Book2", "Mouse Bluetooth Para Samsung Galaxy Book2 Galaxybook4"],
  ["Xiaomi Mi Band 8", "Carregador Usb Magnetico Xiaomi Mi Band 8 Preto"],
  ["Amazfit Bip 5", "Pulseira Silicone Lisa Rosa p/ Amazfit Bip 5 e Bip 6"],
  ["Electrolux ERB30", "Sensor Anti-queda Para Aspirador Electrolux Erb30"],
  ["Mondial AF-30", "Cesta Antiaderente Airfryer Mondial Af-30"],
  ["Dell G15 5530", "Conector Fêmea P/ Notebook Dell G15 5530"],
  ["Lenovo Tab M9", "Pasta + Teclado E Mouse Bluetooth P/ Lenovo Tab M9"],
  ["Xiaomi Watch S3", "Pulseira Bight Compatível Xiaomi Watch S3 / Haylou Watch S8"],
  ["Moto G84 5G", "Tela Display Touch Preto Moto G84 5G XT2347 Incell"],
  ["DJI Mic 2", "Microfone Transmissor Sem Fio Dji Mic 2 Transmitter"],
  ["Xiaomi Redmi Pad SE", "DLveer XIAOMI REDMI PAD SE 11 POLEGADAS 2023 Preto Cor sólida"],
  ["Philco PFR15P", "Botão Resistente Temperatura Para Airfryer Philco Pfr15p"],
];

// Correct matches whose source name omits the product type (mouse, keyboard,
// controller) must keep working, otherwise the guard would reject the queue.
const productCases: Array<[string, string]> = [
  ["M-Audio M-Track Solo", "Interface de Áudio USB M-Audio M-Track Solo com Phantom Power Preto"],
  ["Logitech G102", "Mouse gamer Logitech MOUSE Logitech G102 RGB Gamer G102 branco"],
  ["Razer DeathAdder V3 Pro", "Mouse Sem Fio Razer Deathadder V3 Pro Preto"],
  ["HyperX Alloy Origins Core", "Teclado Gamer Hyperx Alloy Origins Core Switch Hyperx Red"],
  ["Controle Pro Nintendo Switch", "Controle Pro Nintendo Switch Sem Fio Preto"],
  ["Xbox Wireless Controller", "Controle joystick sem fio Microsoft Xbox One preto"],
  ["Samsung Galaxy A55 5G", "Samsung Galaxy A55 5G 256GB 8GB RAM Azul"],
  ["Mondial AFO 12L", "Fritadeira Elétrica Air Fryer Oven Mondial AFO-12L-BI 12L"],
  ["SSL 2", "Interface de Áudio Solid State Logic SSL 2 MKII"],
  ["TP-Link Tapo C310", "Câmera De Segurança TP-Link Tapo C310"],
  ["Xiaomi Robot Vacuum S10", "Aspirador Robô Xiaomi Robot Vacuum S10"],
  ["Sensor Intelbras", "Sensor Intelbras Infravermelho Sem Fio"],
];

for (const [source, matched] of accessoryCases) {
  assert.equal(
    isAccessoryMatch(source, matched),
    true,
    `expected accessory rejection: ${source} -> ${matched}`
  );
}

for (const [source, matched] of productCases) {
  assert.equal(
    isAccessoryMatch(source, matched),
    false,
    `expected product approval: ${source} -> ${matched}`
  );
}

// The production affiliate_links check constraint does not allow a dedicated
// social_list type. Imports use an allowed type and must stay identifiable by
// the source_ref prefix so promotion cannot touch unrelated product_link rows.
assert.equal(SOCIAL_LIST_IMPORT_SOURCE_TYPE, "product_link");
assert.equal(SOCIAL_LIST_SOURCE_REF_PREFIX, "ml_social_list:");
for (const ref of [
  "ml_social_list:MLB123:MLB456",
  " ml_social_list:mlb1:mlb2 ",
]) {
  assert.equal(isSocialListSourceRef(ref), true, `expected social-list ref: ${ref}`);
}
for (const ref of [null, undefined, "", "   ", "manual:MLB1", "ml_social_listing:1"]) {
  assert.equal(isSocialListSourceRef(ref), false, `expected non-social-list ref: ${String(ref)}`);
}

console.log("Mercado Livre refill accessory guard: OK");
console.log("Mercado Livre refill social-list source guard: OK");
