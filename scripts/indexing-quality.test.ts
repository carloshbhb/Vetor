import assert from "node:assert/strict";
import { generateViralArticleSchema } from "../src/lib/seo";
import { INDEXABLE_TAG_MIN_COUNT, isIndexableTag } from "../src/lib/tags";
import type { ViralArticle } from "../src/lib/types";

const article: ViralArticle = {
  slug: "produto-a-vs-produto-b",
  title: "Produto A vs Produto B: qual vale a pena?",
  description: "Comparação editorial baseada nas especificações publicadas.",
  content: "Conteúdo de teste",
  category: "Acessórios para Games",
  hero: { imageUrl: "https://www.vetor.blog/images/comparativo.webp", bars: [] },
  products: [
    { name: "Produto A", slug: "produto-a", imageUrl: "https://www.vetor.blog/images/produto-a.webp" },
    { name: "Produto B", slug: "produto-b", imageUrl: "https://www.vetor.blog/images/produto-b.webp" },
  ],
  seo_title: "Produto A vs Produto B",
  seo_description: "Comparação de teste",
  published_at: "2026-10-01T12:00:00.000Z",
  updated_at: "2026-10-08T12:00:00.000Z",
  created_at: "2026-10-01T12:00:00.000Z",
};

const schema = generateViralArticleSchema(article, new Set(["produto-a"])) as Record<string, any>;
assert.equal(schema["@type"], "Article");
assert.equal(schema.datePublished, "2026-10-01T12:00:00.000Z");
assert.equal(schema.dateModified, "2026-10-08T12:00:00.000Z");
assert.ok(Array.isArray(schema.image) && schema.image[0] === "https://www.vetor.blog/images/comparativo.webp");
assert.equal(schema.mainEntity.itemListElement[0].item["@type"], "Thing");
assert.equal(schema.mainEntity.itemListElement[1].item["@type"], "Thing");
assert.equal("offers" in schema.mainEntity.itemListElement[0].item, false);
assert.equal("offers" in schema.mainEntity.itemListElement[1].item, false);
assert.equal(INDEXABLE_TAG_MIN_COUNT, 4);
assert.equal(isIndexableTag({ count: 3 }), false);
assert.equal(isIndexableTag({ count: 4 }), true);
console.log("indexing-quality: all assertions passed");
