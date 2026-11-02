import assert from "node:assert/strict";
import {
  buildCaptionEntries,
  buildTimedCaptionEntries,
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

const exactSegments = [
  { kind: "hook", text: "Veja este detalhe" },
  { kind: "scene", text: "Tela AMOLED de 120 Hz" },
  { kind: "cta", text: "Leia a análise completa" },
];
const exactWords = exactSegments.flatMap((segment) => segment.text.split(/\s+/));
const exactBoundaries = exactWords.map((word, index) => ({
  type: "WordBoundary",
  offset: index * 350_000 + 100_000,
  duration: 220_000,
  text: word,
}));
const exactCaptions = buildTimedCaptionEntries(exactSegments, exactBoundaries, { maxWords: 3 });
assert.ok(exactCaptions);
assert.equal(exactCaptions[0].segmentKind, "hook");
assert.ok(Math.abs(exactCaptions[0].start - 0.01) < 0.000001);
assert.ok(Math.abs(exactCaptions[0].end - 0.102) < 0.000001);
const sceneCues = exactCaptions.filter((entry) => entry.segmentKind === "scene");
assert.equal(sceneCues.length, 2);
assert.ok(Math.abs(sceneCues[0].start - 0.115) < 0.000001);
assert.equal(exactCaptions[exactCaptions.length - 1].segmentKind, "cta");
assert.equal(buildTimedCaptionEntries(exactSegments, exactBoundaries.slice(1), { maxWords: 3 }), null);
const wrappedCaptions = buildTimedCaptionEntries(
  [{ kind: "scene", text: "Tela AMOLED de 120 Hz" }],
  ["Tela", "AMOLED", "de", "120", "Hz"].map((word, index) => ({
    type: "WordBoundary",
    offset: index * 300_000,
    duration: 220_000,
    text: word,
  })),
  { maxWords: 5, maxLineChars: 12 }
);
assert.ok(wrappedCaptions);
assert.equal(wrappedCaptions[0].text, "Tela AMOLED\\nde 120 Hz");
assert.ok(wrappedCaptions[0].text.split("\\n").every((line) => line.length <= 12));

const mismatchedBoundaries = exactBoundaries.map((item, index) =>
  index === 2 ? { ...item, text: "modelo" } : item
);
assert.equal(buildTimedCaptionEntries(exactSegments, mismatchedBoundaries), null);

const fallbackCaptions = buildCaptionEntries([
  { kind: "hook", start: 0, end: 2, text: "Veja este detalhe" },
  { kind: "scene", start: 2, end: 6, text: "Tela AMOLED de 120 Hz" },
  { kind: "cta", start: 6, end: 8, text: "Leia a análise completa" },
], 5);
assert.deepEqual(fallbackCaptions.map((entry) => entry.segmentKind), ["hook", "scene", "cta"]);

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
  category: "Fones de Ouvido",
  highlights: ["Cancelamento de ruído", "Bateria e autonomia"],
  callToAction: "Veja o review.",
});
assert.ok(shortDescription.includes(purchaseUrl));
assert.ok(shortDescription.includes(reviewUrl));
assert.ok(shortDescription.includes("Fones de Ouvido"));
assert.ok(shortDescription.includes("Cancelamento de ruído"));
assert.ok(shortDescription.includes("links externos na descrição"));
assert.ok(shortDescription.includes("não são clicáveis"));

const longComment = buildCtaComment({ format: longFormat, productTitle: "Produto X", purchaseUrl, reviewUrl });
const shortComment = buildCtaComment({ format: shortFormat, productTitle: "Produto X", purchaseUrl, reviewUrl });
assert.ok(longComment.includes(purchaseUrl));
assert.ok(longComment.includes(reviewUrl));
assert.ok(!shortComment.includes(purchaseUrl));
assert.ok(!shortComment.includes(reviewUrl));
assert.ok(shortComment.includes("Vetor"));
assert.ok(buildVideoTitle({ format: longFormat, productTitle: "Produto X", hook: "Vale a pena?" }).length <= 100);
assert.ok(buildVideoTitle({ format: shortFormat, productTitle: "Produto X", hook: "Esse detalhe muda a compra?" }).includes("#Shorts"));

console.log("video-format contract: all assertions passed");
