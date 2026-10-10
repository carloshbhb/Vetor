import assert from "node:assert/strict";
import { buildComparisonSummaryRows } from "../src/lib/comparison-tables";
import { sanitizeHtml, wrapTablesForHorizontalScroll } from "../src/lib/sanitize";

const rows = buildComparisonSummaryRows([
  { review: { price_new: "R$ 698,40", verdict_score: 8 } },
  { review: null },
  { review: { price_new: "R$ 799,00", verdict_score: 9 } },
]);

assert.equal(rows.length, 2);
assert.deepEqual(rows[0].values, ["R$ 698,40", "—", "R$ 799,00"]);
assert.deepEqual(rows[1].values, ["8", "—", "9"]);
assert.equal(rows[1].winIdx, 2);

const onlyOneScoredProduct = buildComparisonSummaryRows([
  { review: { price_new: "R$ 698,40", verdict_score: 8 } },
  { review: null },
]);
assert.deepEqual(onlyOneScoredProduct[1].values, ["8", "—"]);
assert.equal(onlyOneScoredProduct[1].winIdx, -1);
assert.deepEqual(buildComparisonSummaryRows([{ review: null }, { review: null }]), []);

const html = sanitizeHtml(
  '<p>Especificações</p><table><thead><tr><th>Critério</th><th>Produto</th></tr></thead><tbody><tr><td>Tela</td><td>6,9 polegadas</td></tr></tbody></table>',
);
const wrapped = wrapTablesForHorizontalScroll(html);
assert.match(wrapped, /class="compare-wrap compare-wrap--editorial"/);
assert.equal((wrapped.match(/<table\b/g) || []).length, 1);
assert.equal((wrapped.match(/class="compare-wrap/g) || []).length, 1);

const alreadyWrapped = wrapTablesForHorizontalScroll(
  '<div class="compare-wrap"><table><tbody><tr><td>x</td></tr></tbody></table></div>',
);
assert.equal((alreadyWrapped.match(/class="compare-wrap/g) || []).length, 1);

console.log("comparison-tables: all assertions passed");
