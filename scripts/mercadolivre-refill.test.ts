import assert from "node:assert/strict";
import {
  createDeadlineGuard,
  isAccessoryMatch,
  isSocialListSourceRef,
  promoteMatchedAffiliates,
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
  // Regressão de 2026-11-04: o próprio anúncio do celular era rejeitado como
  // "tela de reposição" por causa da especificação "Tela de 6.7".
  [
    "Celular Samsung Galaxy A17 Com Ia, 128gb, 4gb Ram, Câm De 50mp, Tela De 6.7, Nfc, Ip54 - Cinza",
    "Celular Samsung Galaxy A17 Com Ia, 128gb, 4gb Ram, Câm De 50mp, Tela De 6.7, Nfc, Ip54 - Cinza",
  ],
  [
    "Celular Samsung Galaxy A17 Com Ia, 128gb, 4gb Ram, Câm De 50mp, Tela De 6.7, Nfc, Ip54 - Cinza",
    "Celular Samsung Galaxy A17 Com IA 4gb Ram 128gb Cinza",
  ],
  [
    "Samsung Galaxy A57 5G 128gb 8gb Ram",
    "Smartphone Samsung Galaxy A57 5G 128GB 8GB RAM Tela Super Amoled 6.7 Câmera 50mp",
  ],
];

// Peças de reposição que continuam precisam ser rejeitadas.
const replacementScreenCases: Array<[string, string]> = [
  ["Moto G84 5G", "Tela Display Touch Preto Moto G84 5G XT2347 Incell"],
  ["Samsung Galaxy S21", "Tela Display Touch Incell Para Samsung Galaxy S21"],
  ["Samsung Galaxy S21", "Tela Oled Para Samsung Galaxy S21 Preto"],
  ["Samsung Galaxy S21", "Display Touch Para Motorola G54"],
];

for (const [source, matched] of accessoryCases) {
  assert.equal(
    isAccessoryMatch(source, matched),
    true,
    `expected accessory rejection: ${source} -> ${matched}`
  );
}

for (const [source, matched] of replacementScreenCases) {
  assert.equal(
    isAccessoryMatch(source, matched),
    true,
    `expected replacement part rejection: ${source} -> ${matched}`
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

// The matching batch is rate limited. The deadline guard must stop the loop
// before the CI job timeout so promotion and cleanup still run in the same job.
const guard = createDeadlineGuard(10, 0);
assert.equal(guard.deadlineAt, 10 * 60_000);
assert.equal(guard.isExpired(9 * 60_000), false);
assert.equal(guard.isExpired(10 * 60_000), true);
assert.equal(guard.remainingMs(0), 10 * 60_000);
assert.equal(guard.remainingMs(30 * 60_000), 0);
assert.equal(createDeadlineGuard(0, 0).deadlineAt, 60_000, "invalid minutes fall back to 1 minute");

console.log("Mercado Livre refill deadline guard: OK");

// A Lista Social expõe o mesmo produto em vários item ids. A promoção deve
// promover uma única linha por produto, senão a fila de reviews enche de
// duplicatas do mesmo anúncio.
type FakeUpdate = { id: string; patch: Record<string, unknown> };

function createFakeSupabase(matchRows: unknown[]) {
  const updates: FakeUpdate[] = [];
  const client = {
    from(table: string) {
      return {
        select(_columns?: string) {
          const builder: Record<string, unknown> = {};
          builder.eq = () => builder;
          builder.gte = () => builder;
          builder.order = () => builder;
          builder.limit = () => builder;
          builder.then = (resolve: (value: unknown) => unknown) =>
            Promise.resolve({
              data: table === "affiliate_link_ml_matches" ? matchRows : [],
              error: null,
            }).then(resolve);
          return builder;
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(_column: string, value: string) {
              updates.push({ id: value, patch });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
  return { client: client as never, updates };
}

function socialListSource(id: string, name: string, itemId: string) {
  return {
    id,
    name,
    category: "Lista Social",
    slug: "ml-lista-" + id,
    destination_url: "",
    product_url: "https://www.mercadolivre.com.br/p/" + itemId,
    image_url: null,
    source_type: "product_link",
    source_ref: "ml_social_list:list:" + itemId,
    status: "active",
    priority: 50,
    tags: [],
    notes: "",
    affiliate_tag: null,
  };
}

const echoDot = "Echo Dot 5ª Geração Branco Amazon Smart Speaker Com Alexa Controle Por Voz";

const promotionRows = [
  {
    affiliate_link_id: "link-1",
    matched_item_id: "MLB111111",
    matched_product_id: null,
    matched_title: echoDot,
    matched_url: "https://www.mercadolivre.com.br/echo-dot-5/p/MLB111111",
    match_score: 1,
    match_status: "matched",
    affiliate_links: socialListSource("link-1", echoDot, "MLB111111"),
  },
  {
    // Mesmo nome de produto em outro item id: é o mesmo produto.
    affiliate_link_id: "link-2",
    matched_item_id: "MLB222222",
    matched_product_id: null,
    matched_title: echoDot,
    matched_url: "https://www.mercadolivre.com.br/echo-dot-5/p/MLB222222",
    match_score: 0.95,
    match_status: "matched",
    affiliate_links: socialListSource("link-2", echoDot, "MLB222222"),
  },
  {
    // Nome diferente, mesmo item do Mercado Livre: também é o mesmo produto.
    affiliate_link_id: "link-3",
    matched_item_id: "MLB111111",
    matched_product_id: null,
    matched_title: "Amazon Echo Dot 5ª Geração Com Alexa Controle Por Voz",
    matched_url: "https://www.mercadolivre.com.br/echo-dot-5/p/MLB111111",
    match_score: 0.92,
    match_status: "matched",
    affiliate_links: socialListSource("link-3", "Amazon Echo Dot 5ª Geração Com Alexa Controle Por Voz", "MLB333333"),
  },
  {
    affiliate_link_id: "link-4",
    matched_item_id: "MLB444444",
    matched_product_id: null,
    matched_title: "Controle Gamesir G7 Pro Sem Fio Para Xbox, Pc E Android Prateado",
    matched_url: "https://www.mercadolivre.com.br/gamesir-g7-pro/p/MLB444444",
    match_score: 0.9,
    match_status: "matched",
    affiliate_links: socialListSource(
      "link-4",
      "Controle Gamesir G7 Pro Sem Fio Para Xbox, Pc E Android Prateado",
      "MLB444444"
    ),
  },
];

async function runPromotionDedupCheck(): Promise<void> {
  const fake = createFakeSupabase(promotionRows);
  const promotion = await promoteMatchedAffiliates(fake.client, { dryRun: false });

  assert.equal(promotion.promoted, 2, "one promotion per product, not per social-list row");
  assert.equal(promotion.duplicateMatches, 2, "duplicate rows must be reported");
  assert.equal(promotion.errors, 0);
  assert.equal(fake.updates.length, 2, "only the promoted rows are written");
  assert.deepEqual(
    fake.updates.map((entry) => entry.id).sort(),
    ["link-1", "link-4"]
  );
  for (const entry of fake.updates) {
    assert.equal(entry.patch.source_type, "comparison_product");
    assert.equal(entry.patch.status, "active");
    assert.ok(String(entry.patch.destination_url).startsWith("https://"));
  }

  console.log("Mercado Livre refill promotion dedup: OK");
}

runPromotionDedupCheck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
