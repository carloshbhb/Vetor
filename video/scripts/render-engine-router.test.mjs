import assert from "node:assert/strict";
import { resolveRenderEngine } from "./render-engine-router.mjs";

const manual = resolveRenderEngine({
  mediaAssets: [{ type: "render_engine", requested: "hyperframes" }],
  videoData: { templateId: "product-editorial", scenes: [] },
});
assert.equal(manual.engine, "hyperframes");
assert.equal(manual.mode, "manual");

const manualRemotionBeatsAuto = resolveRenderEngine({
  mediaAssets: [{ type: "render_engine", requested: "remotion" }, { type: "visual_style", style: "cinematic-motion" }],
  videoData: { templateId: "product-editorial", scenes: [] },
});
assert.equal(manualRemotionBeatsAuto.engine, "remotion");

const lemoAuto = resolveRenderEngine({
  mediaAssets: [{ type: "visual_style", style: "cinematic-product" }],
  videoData: { templateId: "product-editorial", scenes: [] },
});
assert.equal(lemoAuto.engine, "lemo-opuscar");
assert.equal(lemoAuto.mode, "automatic");

const hyperframesAuto = resolveRenderEngine({
  mediaAssets: [{ type: "visual_style", style: "rapid-montage" }],
  videoData: { templateId: "product-editorial", scenes: [] },
});
assert.equal(hyperframesAuto.engine, "hyperframes");

const stickman = resolveRenderEngine({
  mediaAssets: [],
  videoData: { templateId: "stickman-review", scenes: [] },
});
assert.equal(stickman.engine, "remotion");

const visualHint = resolveRenderEngine({
  mediaAssets: [],
  videoData: { templateId: "product-editorial", scenes: [{ visualCue: "Kinetic typography with animated title" }] },
});
assert.equal(visualHint.engine, "lemo-opuscar");

const defaultRoute = resolveRenderEngine({
  mediaAssets: [],
  videoData: { templateId: "shorts-retention", scenes: [{ visualCue: "Tela AMOLED e bateria" }] },
});
assert.equal(defaultRoute.engine, "remotion");

assert.throws(() => resolveRenderEngine({
  mediaAssets: [{ type: "render_engine", requested: "lemo-opuscar" }, { type: "visual_style", style: "stickman" }],
  videoData: { templateId: "stickman-review", scenes: [] },
}), /exclusivo do Remotion/);

console.log("multi-render engine routing tests passed");
