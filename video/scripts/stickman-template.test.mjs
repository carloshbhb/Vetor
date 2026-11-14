import assert from "node:assert/strict";
import { isStickmanReviewTemplate, resolveVisualTemplate } from "./stickman-template.mjs";

assert.equal(isStickmanReviewTemplate(null), false);
assert.equal(isStickmanReviewTemplate([]), false);
assert.equal(isStickmanReviewTemplate([{ type: "publication_format", format: "long" }]), false);
assert.equal(
  isStickmanReviewTemplate([{ type: "visual_style", style: "stickman" }]),
  true
);
assert.equal(
  isStickmanReviewTemplate([{ type: "video_template", template: "animated-stickman" }]),
  true
);
assert.equal(
  isStickmanReviewTemplate([{ type: "character_style", value: "stickman-review" }]),
  true
);
assert.equal(isStickmanReviewTemplate(["vetor-stickman-review"]), true);
assert.equal(resolveVisualTemplate([{ type: "visual_style", style: "stickman" }], "long"), "stickman-review");
assert.throws(
  () => resolveVisualTemplate([{ type: "visual_style", style: "stickman" }], "short"),
  /formato longo horizontal/
);
console.log("Stickman visual template contract: OK");
