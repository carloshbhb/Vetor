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
  ["Samsung Galaxy Book2", "Mouse Bluetooth p/Samsung Galaxy Book2 Galaxybook4"],
  ["Samsung Galaxy Book2", "Headset Bluetooth Para Samsung Galaxy Book2 Galaxybook4"],
  ["Dell G15 5530", "Webcam Para Notebook Dell G15 5530"],
  ["Samsung Galaxy A55 5G", "Bateria Extra Para Samsung Galaxy A55 5G"],
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
  ["Samsung Galaxy S23", "Suporte Veicular Para Samsung Galaxy S23"],
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
  // "Display touch" é especificação do aparelho quando o título nomeia o
  // produto ou traz capacidade; não pode ser confundido com tela de reposição.
  ["Samsung Galaxy S23", "Samsung Galaxy S23 Display Touch 6.2 256GB"],
  ["Apple iPhone 15", "iPhone 15 Display Touch 128GB"],
  // Matching por substring transformava "capacitor" em "capa" e bloqueava o produto.
  ["Fonte Chaveada 12v", "Fonte Chaveada 12v 10a Com Capacitor De Filtro"],
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
//
// O fake precisa respeitar os filtros do PostgREST: a escrita otimista só pode
// afetar a linha que ainda está exatamente no estado lido. Um fake que ignora
// `.eq()` esconde justamente a corrida que o lock existe para evitar.
type FakeUpdate = {
  table: string;
  patch: Record<string, unknown>;
  filters: Array<[string, string]>;
  matched: number;
};

type FakeLinkRow = Record<string, unknown> & { id: string };

function matchesFilters(
  row: Record<string, unknown>,
  filters: Array<[string, string]>
): boolean {
  return filters.every(([column, value]) => String(row[column] ?? "") === value);
}

function createFakeSupabase(input: {
  matchRows: unknown[];
  linkRows?: FakeLinkRow[];
}) {
  const updates: FakeUpdate[] = [];
  const matchRows = input.matchRows.slice();
  const linkRows = (input.linkRows || []).map((row) => ({ ...row }));

  function createSelectBuilder(table: string) {
    const filters: Array<[string, string]> = [];
    let minimumScore: number | null = null;
    let limit = Number.POSITIVE_INFINITY;

    const rowsFor = (): unknown[] => {
      const source = table === "affiliate_link_ml_matches" ? matchRows : linkRows;
      let rows = source.filter((row) =>
        matchesFilters(row as Record<string, unknown>, filters)
      );
      if (minimumScore != null) {
        rows = rows.filter(
          (row) =>
            Number((row as Record<string, unknown>).match_score || 0) >=
            (minimumScore as number)
        );
      }
      return rows.slice(0, limit);
    };

    const builder: Record<string, unknown> = {};
    builder.eq = (column: string, value: string) => {
      filters.push([column, String(value)]);
      return builder;
    };
    builder.neq = () => builder;
    builder.is = () => builder;
    builder.gte = (column: string, value: number) => {
      if (column === "match_score") minimumScore = Number(value);
      return builder;
    };
    builder.order = () => builder;
    builder.limit = (value: number) => {
      limit = value;
      return builder;
    };
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown
    ) =>
      Promise.resolve({ data: rowsFor(), error: null }).then(resolve, reject);
    return builder;
  }

  function createUpdateBuilder(table: string, patch: Record<string, unknown>) {
    const filters: Array<[string, string]> = [];
    let returnRows = false;

    const apply = () => {
      const source = table === "affiliate_link_ml_matches" ? matchRows : linkRows;
      const matched = source.filter((row) =>
        matchesFilters(row as Record<string, unknown>, filters)
      );
      for (const row of matched) {
        Object.assign(row as Record<string, unknown>, patch);
      }
      updates.push({
        table,
        patch,
        filters: filters.map(([column, value]) => [column, value]),
        matched: matched.length,
      });
      return matched;
    };

    const builder: Record<string, unknown> = {};
    builder.eq = (column: string, value: string) => {
      filters.push([column, String(value)]);
      return builder;
    };
    builder.select = () => {
      returnRows = true;
      return builder;
    };
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown
    ) => {
      const matched = apply();
      const data = returnRows
        ? matched.map((row) => ({
            id: (row as Record<string, unknown>).id,
          }))
        : null;
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    };
    return builder;
  }

  const client = {
    from(table: string) {
      return {
        select(_columns?: string) {
          return createSelectBuilder(table);
        },
        update(patch: Record<string, unknown>) {
          return createUpdateBuilder(table, patch);
        },
      };
    },
  };
  return { client: client as never, updates, linkRows };
}

function sourceRow(row: (typeof promotionRows)[number]): FakeLinkRow {
  return { ...(row.affiliate_links as Record<string, unknown>) } as FakeLinkRow;
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
  const fake = createFakeSupabase({
    matchRows: promotionRows,
    linkRows: promotionRows.map(sourceRow),
  });
  const promotion = await promoteMatchedAffiliates(fake.client, { dryRun: false });

  assert.equal(promotion.promoted, 2, "one promotion per product, not per social-list row");
  assert.equal(promotion.duplicateMatches, 2, "duplicate rows must be reported");
  assert.equal(promotion.errors, 0);
  assert.equal(promotion.skippedConcurrent, 0);
  const linkWrites = fake.updates.filter((entry) => entry.table === "affiliate_links");
  assert.equal(linkWrites.length, 2, "only the promoted rows are written");
  assert.deepEqual(
    linkWrites.map((entry) => entry.filters[0][1]).sort(),
    ["link-1", "link-4"]
  );
  for (const entry of linkWrites) {
    assert.equal(entry.patch.source_type, "comparison_product");
    assert.equal(entry.patch.status, "active");
    assert.ok(String(entry.patch.destination_url).startsWith("https://"));
    assert.equal(entry.matched, 1);
    // O lock otimista exige que a linha lida continue ativa, do mesmo tipo e
    // ainda sem destino.
    assert.deepEqual(
      entry.filters.map(([column]) => column).sort(),
      ["destination_url", "id", "source_type", "status"]
    );
  }

  console.log("Mercado Livre refill promotion dedup: OK");
}

// A linha pode ser pausada por um humano entre a leitura e a escrita. O update
// filtrado afeta zero linhas e a promoção não pode contar como sucesso.
async function runPromotionConcurrencyCheck(): Promise<void> {
  const matchRows = [
    {
      affiliate_link_id: "link-race",
      matched_item_id: "MLB555555",
      matched_product_id: null,
      matched_title: "Mouse Sem Fio Logitech M170",
      matched_url: "https://www.mercadolivre.com.br/mouse-logitech-m170/p/MLB555555",
      match_score: 0.97,
      match_status: "matched",
      affiliate_links: socialListSource(
        "link-race",
        "Mouse Sem Fio Logitech M170",
        "MLB555555"
      ),
    },
  ];
  const linkRows: FakeLinkRow[] = [
    {
      ...socialListSource("link-race", "Mouse Sem Fio Logitech M170", "MLB555555"),
      // Estado atual no banco: pausado depois da leitura dos matches.
      status: "paused",
    },
  ];

  const fake = createFakeSupabase({ matchRows, linkRows });
  const promotion = await promoteMatchedAffiliates(fake.client, { dryRun: false });

  assert.equal(promotion.promoted, 0, "a paused row must not be promoted");
  assert.equal(promotion.skippedConcurrent, 1, "zero-row update must be reported");
  assert.equal(promotion.errors, 0);
  const linkWrites = fake.updates.filter((entry) => entry.table === "affiliate_links");
  assert.equal(linkWrites.length, 1);
  assert.equal(linkWrites[0].matched, 0, "the optimistic filter must block the write");

  console.log("Mercado Livre refill promotion concurrency: OK");
}

// Uma linha já pausada nunca deve ser reativada pela promoção, mesmo com match
// de alta confiança.
async function runPromotionInactiveCheck(): Promise<void> {
  const paused = {
    ...socialListSource("link-paused", "Echo Dot 5ª Geração Branco", "MLB666666"),
    status: "paused",
  };
  const matchRows = [
    {
      affiliate_link_id: "link-paused",
      matched_item_id: "MLB666666",
      matched_product_id: null,
      matched_title: "Echo Dot 5ª Geração Branco Amazon Smart Speaker Com Alexa",
      matched_url: "https://www.mercadolivre.com.br/echo-dot-5/p/MLB666666",
      match_score: 0.99,
      match_status: "matched",
      affiliate_links: paused,
    },
  ];
  const fake = createFakeSupabase({ matchRows, linkRows: [{ ...paused }] });
  const promotion = await promoteMatchedAffiliates(fake.client, { dryRun: false });

  assert.equal(promotion.promoted, 0);
  assert.equal(promotion.skippedInactive, 1);
  assert.equal(promotion.skippedUnsafe, 0, "paused is not unsafe, it is intentional");
  assert.equal(fake.updates.length, 0, "no write for an inactive row");

  console.log("Mercado Livre refill promotion inactive guard: OK");
}

// Acessório recusado deve sair da fila como `review`, com o motivo gravado.
// Sem isso o mesmo mouse volta a ser tentado em todo refill.
async function runAccessoryReviewCheck(): Promise<void> {
  const source = socialListSource(
    "link-accessory",
    "Samsung Galaxy Book2",
    "MLB777777"
  );
  const matchRows = [
    {
      affiliate_link_id: "link-accessory",
      matched_item_id: "MLB777777",
      matched_product_id: null,
      matched_title: "Mouse Bluetooth Para Samsung Galaxy Book2 Galaxybook4",
      matched_url: "https://www.mercadolivre.com.br/mouse-bluetooth/p/MLB777777",
      match_score: 0.95,
      match_status: "matched",
      affiliate_links: source,
    },
  ];
  const fake = createFakeSupabase({ matchRows, linkRows: [{ ...source }] });
  const promotion = await promoteMatchedAffiliates(fake.client, { dryRun: false });

  assert.equal(promotion.promoted, 0);
  assert.equal(promotion.skippedAccessory, 1);
  assert.equal(promotion.accessoryCandidates.length, 1);
  assert.equal(fake.updates.filter((entry) => entry.table === "affiliate_links").length, 0);

  const reviewWrites = fake.updates.filter(
    (entry) => entry.table === "affiliate_link_ml_matches"
  );
  assert.equal(reviewWrites.length, 1);
  assert.equal(reviewWrites[0].patch.match_status, "review");
  assert.match(String(reviewWrites[0].patch.error_message), /acessório\/peça/i);
  assert.equal(reviewWrites[0].matched, 1);
  assert.deepEqual(
    reviewWrites[0].filters.map(([column]) => column).sort(),
    ["affiliate_link_id", "matched_item_id"]
  );

  console.log("Mercado Livre refill accessory review marking: OK");
}

async function main(): Promise<void> {
  await runPromotionDedupCheck();
  await runPromotionConcurrencyCheck();
  await runPromotionInactiveCheck();
  await runAccessoryReviewCheck();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
