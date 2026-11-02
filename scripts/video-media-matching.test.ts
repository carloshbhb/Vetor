import assert from "node:assert/strict";
import {
  dedupeMercadoLivreImages,
  extractMercadoLivreItemId,
  findBestMercadoLivreItemMatch,
  normalizeMercadoLivreImageUrl,
} from "../src/lib/video-media-matching";

assert.equal(extractMercadoLivreItemId("https://produto.mercadolivre.com.br/MLB-7902750010-pulseira-fit3"), "MLB7902750010");
assert.equal(extractMercadoLivreItemId("https://meli.la/abc123"), null);

const fit3 = findBestMercadoLivreItemMatch("Samsung Galaxy Fit3", [
  { item_id: "MLB7902750010", product_id: "MLB34062353", title: "Samsung Galaxy Fit3 Pulseira Esportiva Grafite Esportivo" },
  { item_id: "MLB7572496272", product_id: "MLB34506161", title: "Smartwatch Samsung Galaxy Fit3 Display 1.6 Rose Esportivo" },
]);
assert.ok(fit3);
assert.equal(fit3.confidence, 1);

const echo = findBestMercadoLivreItemMatch("Echo Dot 5", [
  { item_id: "MLB3616972805", product_id: "MLB25727897", title: "Amazon Echo Dot Echo Dot (5th Gen) com Assistente Virtual Alexa" },
]);
assert.ok(echo);
assert.equal(echo.candidate.item_id, "MLB3616972805");
assert.equal(findBestMercadoLivreItemMatch("Echo Dot 4", [
  { item_id: "MLB3616972805", product_id: "MLB25727897", title: "Amazon Echo Dot Echo Dot (5th Gen) com Assistente Virtual Alexa" },
]), null, "different generation numbers must not match");

assert.equal(findBestMercadoLivreItemMatch("Samsung Galaxy A56", [
  { item_id: "MLB7916348648", product_id: "MLB68201987", title: "Celular Samsung Galaxy A57 5G 256GB 8GB RAM" },
]), null, "different model numbers must not match");

assert.equal(findBestMercadoLivreItemMatch("Galaxy Buds 4 Pro", [
  { item_id: "MLB1111111111", product_id: "P1", title: "Samsung Galaxy Buds 4 Pro" },
  { item_id: "MLB2222222222", product_id: "P2", title: "Samsung Galaxy Buds 4 Pro" },
]), null, "ambiguous catalog products must be rejected");

assert.equal(
  normalizeMercadoLivreImageUrl("http://http2.mlstatic.com/D_NQ_NP_123-I.jpg"),
  "https://http2.mlstatic.com/D_NQ_NP_123-O.jpg",
);
assert.equal(normalizeMercadoLivreImageUrl("https://images.unsplash.com/photo.jpg"), null);
assert.deepEqual(
  dedupeMercadoLivreImages([
    "http://http2.mlstatic.com/a-I.jpg",
    "https://http2.mlstatic.com/a-O.jpg",
    "https://http2.mlstatic.com/b-I.jpg",
  ]),
  ["https://http2.mlstatic.com/a-O.jpg", "https://http2.mlstatic.com/b-O.jpg"],
);

console.log("video media matching: all assertions passed");
