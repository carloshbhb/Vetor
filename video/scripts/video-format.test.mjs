import assert from "node:assert/strict";
import {
  buildCaptionEntries,
  buildCtaComment,
  buildVideoDescription,
  buildVideoTitle,
  formatYouTubeTimestamp,
  resolveVideoFormat,
} from "./video-format.mjs";

const purchaseUrl = "https://www.vetor.blog/go/produto/";
const reviewUrl = "https://www.vetor.blog/reviews/produto/";
const longFormat = resolveVideoFormat([{ type: "publication_format", format: "long" }]);
const shortFormat = resolveVideoFormat([{ type: "publication_format", format: "short" }]);

assert.equal(longFormat, "long");
assert.equal(shortFormat, "short");
assert.equal(resolveVideoFormat([]), "short");
assert.equal(formatYouTubeTimestamp(0), "0:00");
assert.equal(formatYouTubeTimestamp(75), "1:15");
assert.equal(formatYouTubeTimestamp(3661), "1:01:01");
const captions = buildCaptionEntries([{ start: 10, end: 20, text: "Um dois três quatro cinco seis sete oito nove dez" }], 5);
assert.equal(captions.length, 2);
assert.equal(captions[0].text, "Um dois três quatro cinco");
assert.equal(captions[1].text, "seis sete oito nove dez");
assert.ok(captions[0].start >= 10 && captions[1].end <= 20);
assert.ok(Math.abs(captions[0].end - captions[1].start) < 0.0001);

const longDescription = buildVideoDescription({
  format: longFormat,
  productTitle: "Produto X",
  purchaseUrl,
  reviewUrl,
  hook: "Vale a pena?",
  callToAction: "Confira as condições atuais.",
  chapters: [{ time: 0, title: "Introdução" }, { time: 65, title: "Limitações" }],
});
assert.ok(longDescription.includes(purchaseUrl));
assert.ok(longDescription.includes(reviewUrl));
assert.ok(longDescription.includes("0:00 Introdução"));
assert.ok(longDescription.includes("1:05 Limitações"));

const shortDescription = buildVideoDescription({
  format: shortFormat,
  productTitle: "Produto X",
  purchaseUrl,
  reviewUrl,
  hook: "Esse detalhe muda a compra?",
  callToAction: "Veja o review.",
});
assert.ok(!shortDescription.includes(purchaseUrl));
assert.ok(!shortDescription.includes(reviewUrl));
assert.ok(shortDescription.includes("link do perfil"));

const longComment = buildCtaComment({ format: longFormat, productTitle: "Produto X", purchaseUrl, reviewUrl });
const shortComment = buildCtaComment({ format: shortFormat, productTitle: "Produto X", purchaseUrl, reviewUrl });
assert.ok(longComment.includes(purchaseUrl));
assert.ok(longComment.includes(reviewUrl));
assert.ok(!shortComment.includes(purchaseUrl));
assert.ok(!shortComment.includes(reviewUrl));
assert.ok(buildVideoTitle({ format: longFormat, productTitle: "Produto X", hook: "Vale a pena?" }).length <= 100);
assert.ok(buildVideoTitle({ format: shortFormat, productTitle: "Produto X", hook: "Esse detalhe muda a compra?" }).includes("#Shorts"));

console.log("video-format contract: all assertions passed");
