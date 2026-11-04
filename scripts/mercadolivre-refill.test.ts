import assert from "node:assert/strict";
import { isAccessoryMatch } from "../src/lib/mercadolivre-refill";

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

console.log("Mercado Livre refill accessory guard: OK");
