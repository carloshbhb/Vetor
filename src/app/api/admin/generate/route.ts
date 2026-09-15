import { NextResponse } from "next/server";
import { createReview, createViralArticle } from "@/lib/supabase";
import { generateReview } from "@/lib/generate";
import { generateViralArticle } from "@/lib/generate-viral";
import { resolveProductImage } from "@/lib/image-resolver";

const REVIEW_PRODUCTS = [
  { title: "Samsung Galaxy Fit3", category: "Wearables", price: "R$199", image: "https://http2.mlstatic.com/D_NQ_NP_samsung-fit3.webp", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-fit3" },
  { title: "Redmi Watch 5", category: "Wearables", price: "R$299", image: "https://http2.mlstatic.com/D_NQ_NP_redmi-watch5.webp", product_url: "https://www.mercadolivre.com.br/redmi-watch-5" },
  { title: "AirPods Pro 2", category: "Fones de Ouvido", price: "R$1299", image: "https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp", product_url: "https://www.mercadolivre.com.br/airpods-pro-2" },
  { title: "MacBook Air M3", category: "Notebooks", price: "R$8999", image: "https://http2.mlstatic.com/D_NQ_NP_macbook-air-m3.webp", product_url: "https://www.mercadolivre.com.br/macbook-air-m3" },
  { title: "Apple Watch Series 9", category: "Wearables", price: "R$3299", image: "https://http2.mlstatic.com/D_NQ_NP_apple-watch-s9.webp", product_url: "https://www.mercadolivre.com.br/apple-watch-series-9" },
  { title: "Sony WF-1000XM5", category: "Fones de Ouvido", price: "R$1599", image: "https://http2.mlstatic.com/D_NQ_NP_sony-wf1000xm5.webp", product_url: "https://www.mercadolivre.com.br/sony-wf-1000xm5" },
];

const VIRAL_TOPICS = [
  {
    title: "Galaxy S24 vs iPhone 15 vs Pixel 8: O Melhor Smartphone 2026?",
    category: "Smartphones",
    comparisonProducts: [
      { name: "Galaxy S24", slug: "galaxy-s24", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp", product_url: "https://www.mercadolivre.com.br/galaxy-s24" },
      { name: "iPhone 15", slug: "iphone-15", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp", product_url: "https://www.mercadolivre.com.br/iphone-15" },
      { name: "Pixel 8", slug: "pixel-8", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_pixel-8.webp", product_url: "https://www.mercadolivre.com.br/pixel-8" },
    ],
  },
  {
    title: "AirPods Pro 2 vs Galaxy Buds Pro vs Sony WF-1000XM5",
    category: "Fones de Ouvido",
    comparisonProducts: [
      { name: "AirPods Pro 2", slug: "airpods-pro-2", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp", product_url: "https://www.mercadolivre.com.br/airpods-pro-2" },
      { name: "Galaxy Buds Pro", slug: "galaxy-buds-pro", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_galaxy-buds-pro.webp", product_url: "https://www.mercadolivre.com.br/galaxy-buds-pro" },
      { name: "Sony WF-1000XM5", slug: "sony-wf-1000xm5", imageUrl: "https://http2.mlstatic.com/D_NQ_NP_sony-wf1000xm5.webp", product_url: "https://www.mercadolivre.com.br/sony-wf-1000xm5" },
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    const results: string[] = [];

    const product = pickRandom(REVIEW_PRODUCTS);
    try {
      const review = await generateReview({
        ...product,
        product_url: product.product_url,
        marketplace: 'mercadolivre',
      });
      const dbResult = await createReview({
        slug: review.slug,
        product: review.title,
        category: review.category,
        price_new: review.price,
        image_url: review.image,
        meta_title: review.seo_title,
        meta_description: review.seo_description,
        marketplace: 'mercadolivre',
        affiliate_url: product.product_url || review.image,
      });
      if (dbResult.error) {
        results.push(`Review "${review.title}": erro ao salvar - ${dbResult.error}`);
      } else {
        results.push(`Review "${review.title}": criado com sucesso`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push(`Review: erro na geração - ${message}`);
    }

    const topic = pickRandom(VIRAL_TOPICS);
    try {
      const resolvedProducts = await Promise.all(
        topic.comparisonProducts.map(async (p) => ({
          ...p,
          imageUrl: await resolveProductImage(p.imageUrl),
        }))
      );

      const article = await generateViralArticle({
        title: topic.title,
        category: topic.category,
        comparisonProducts: resolvedProducts,
      });

      const dbResult = await createViralArticle({
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category,
        content: article.content,
        hero: article.hero,
        products: resolvedProducts,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
      });

      if (dbResult.error) {
        results.push(`Artigo "${article.title}": erro ao salvar - ${dbResult.error}`);
      } else {
        results.push(`Artigo "${article.title}": criado com sucesso`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push(`Artigo viral: erro na geração - ${message}`);
    }

    return NextResponse.json({
      success: true,
      message: results.join("; "),
      count: results.filter((r) => r.includes("sucesso")).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
