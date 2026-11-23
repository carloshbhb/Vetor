import assert from "node:assert/strict";
import { LEMO_STYLE_CATALOG, LEMO_STYLE_COUNT, listLemoStyles, normalizeLemoStyleId, resolveLemoStyle } from "./lemo-style-catalog.mjs";

assert.equal(LEMO_STYLE_COUNT, 99);
assert.equal(LEMO_STYLE_CATALOG.length, 99);
assert.equal(listLemoStyles().length, 99);
assert.equal(new Set(LEMO_STYLE_CATALOG.map((style) => style.id)).size, 99);
assert.equal(new Set(LEMO_STYLE_CATALOG.map((style) => style.family)).size, 15);
assert.equal(normalizeLemoStyleId("Ukiyo-e"), "ukiyoe");
assert.equal(normalizeLemoStyleId("Premium Product 3D"), "glass-product");
assert.equal(normalizeLemoStyleId("Kinetic Typography"), "swiss-motion");
assert.equal(resolveLemoStyle("lidar-survey").family, "evidence");
assert.equal(LEMO_STYLE_CATALOG.filter((style) => style.imageGenerationRequired).length, 3);
assert.equal(LEMO_STYLE_CATALOG.every((style) => /^#[0-9A-F]{6}$/i.test(style.accent)), true);
console.log("[lemo-style-catalog] 99 styles, 15 visual families, aliases and image-generation flags passed.");
