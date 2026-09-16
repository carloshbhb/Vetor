import { NextResponse } from "next/server";
import { createReview, createViralArticle } from "@/lib/supabase";
import { generateReview } from "@/lib/generate";
import { generateViralArticle } from "@/lib/generate-viral";
import { resolveProductImage } from "@/lib/image-resolver";
import { fetchBestSellers } from "@/lib/product-extractor";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    const results: string[] = [];

    let bestSellers: Array<{ product_name: string; product_url: string; category: string }>;
    try {
      bestSellers = await fetchBestSellers();
    } catch {
      bestSellers = [];
    }

    if (bestSellers.length > 0) {
      const product = pickRandom(bestSellers);
      try {
        const review = await generateReview({
          title: product.product_name,
          category: product.category,
          price: "R$0",
          image: "",
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
    } else {
      results.push("Nenhum produto dos mais vendidos disponível para review");
    }

    const topProducts = bestSellers.slice(0, 3);
    if (topProducts.length >= 2) {
      const category = topProducts[0].category;
      const topicTitle = `${topProducts.map(p => p.product_name.split(' ').slice(0, 2).join(' ')).join(' vs ')}: O Melhor ${category}?`;
      const comparisonProducts = topProducts.map(p => ({
        name: p.product_name,
        slug: p.product_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
        imageUrl: `https://http2.mlstatic.com/D_NQ_NP_${p.product_name.toLowerCase().split(' ').slice(0, 2).join('-')}.webp`,
        product_url: p.product_url,
      }));

      try {
        const resolvedProducts = await Promise.all(
          comparisonProducts.map(async (p) => ({
            ...p,
            imageUrl: await resolveProductImage(p.imageUrl),
          }))
        );

        const article = await generateViralArticle({
          title: topicTitle,
          category: category,
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
