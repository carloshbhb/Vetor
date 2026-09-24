import { NextRequest, NextResponse } from "next/server";
import { createViralArticle, getAllReviews } from "@/lib/supabase";
import { generateViralArticle } from "@/lib/generate-viral";
import { resolveProductImage } from "@/lib/image-resolver";
import { fetchBestSellers } from "@/lib/product-extractor";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  getNextReviewProductLink,
  markProductLinkReviewed,
} from "@/lib/product-links";
import {
  productLinkToPipelineInput,
  runReviewPipeline,
  type PipelineProductInput,
} from "@/lib/content-pipeline";

interface SourceProduct {
  product_name: string;
  product_url: string;
  category: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureSupabaseProducts(): Promise<SourceProduct[]> {
  const reviews = await getAllReviews();
  const uniqueProducts = new Map<string, SourceProduct>();
  for (const r of reviews.slice(0, 50)) {
    if (r.affiliate_url && !uniqueProducts.has(r.affiliate_url)) {
      uniqueProducts.set(r.affiliate_url, {
        product_name: r.product,
        product_url: r.affiliate_url,
        category: r.category,
      });
    }
  }
  return Array.from(uniqueProducts.values());
}

function toSourceProduct(product: PipelineProductInput): SourceProduct {
  return {
    product_name: product.title,
    product_url: product.product_url || "",
    category: product.category,
  };
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const results: string[] = [];

    let bestSellers: SourceProduct[] = [];
    try {
      bestSellers = await fetchBestSellers();
      if (bestSellers.length > 0) {
        results.push(`✅ Scraping ML: ${bestSellers.length} produtos`);
      }
    } catch (e) {
      results.push(
        `⚠️ Scraping ML falhou: ${e instanceof Error ? e.message : "erro desconhecido"}`
      );
    }

    const backlogLink = await getNextReviewProductLink();

    if (backlogLink) {
      const outcome = await runReviewPipeline(
        productLinkToPipelineInput(backlogLink),
        "admin"
      );

      if (outcome.status === "validation_failed") {
        return NextResponse.json(
          {
            error: "Quality validation failed for generated review",
            issues: outcome.issues,
            details: {
              slug: outcome.slug ?? null,
              title: outcome.title ?? backlogLink.product_name,
            },
          },
          { status: 422 }
        );
      }

      if (outcome.status === "created") {
        await markProductLinkReviewed(backlogLink.id, outcome.slug);
        results.push(
          `✅ Review "${outcome.title}": criado com sucesso (backlog: ${backlogLink.product_name})`
        );
      } else if (outcome.status === "db_error") {
        results.push(
          `Review "${outcome.title ?? backlogLink.product_name}": erro ao salvar - ${outcome.error}`
        );
      } else {
        results.push(`Review: erro na geração - ${outcome.error}`);
      }
    } else {
      let fallbackProducts: SourceProduct[] = [];
      try {
        fallbackProducts = await ensureSupabaseProducts();
        if (fallbackProducts.length > 0) {
          results.push(
            `✅ Fallback Supabase: ${fallbackProducts.length} produtos únicos`
          );
        }
      } catch (e) {
        results.push(
          `⚠️ Fallback Supabase falhou: ${e instanceof Error ? e.message : "erro"}`
        );
      }

      const productsToUse =
        bestSellers.length > 0 ? bestSellers : fallbackProducts;

      if (productsToUse.length > 0) {
        const product = pickRandom(productsToUse);
        const outcome = await runReviewPipeline(
          {
            title: product.product_name,
            category: product.category || "Geral",
            price: "R$0",
            image: "",
            product_url: product.product_url,
            marketplace: "mercadolivre",
          },
          "admin"
        );

        if (outcome.status === "validation_failed") {
          return NextResponse.json(
            {
              error: "Quality validation failed for generated review",
              issues: outcome.issues,
              details: {
                slug: outcome.slug ?? null,
                title: outcome.title ?? product.product_name,
              },
            },
            { status: 422 }
          );
        }

        if (outcome.status === "created") {
          results.push(`✅ Review "${outcome.title}": criado com sucesso`);
        } else if (outcome.status === "db_error") {
          results.push(
            `Review "${outcome.title ?? product.product_name}": erro ao salvar - ${outcome.error}`
          );
        } else {
          results.push(`Review: erro na geração - ${outcome.error}`);
        }
      } else {
        results.push(
          "❌ Nenhum produto disponível para review (backlog + scraping + fallback falharam)"
        );
      }
    }

    let viralSource: SourceProduct[];
    if (bestSellers.length > 0) {
      viralSource = bestSellers;
    } else if (backlogLink) {
      viralSource = [toSourceProduct(productLinkToPipelineInput(backlogLink))];
      try {
        viralSource = viralSource.concat(await ensureSupabaseProducts());
      } catch {
        // keep single-product source
      }
    } else {
      try {
        viralSource = await ensureSupabaseProducts();
      } catch {
        viralSource = [];
      }
    }

    const topProducts = viralSource.slice(0, 3);
    if (topProducts.length >= 2) {
      const category = topProducts[0].category;
      const topicTitle = `${topProducts
        .map((p) => p.product_name.split(" ").slice(0, 2).join(" "))
        .join(" vs ")}: O Melhor ${category}?`;
      const comparisonProducts = topProducts.map((p) => ({
        name: p.product_name,
        slug: p.product_name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, ""),
        imageUrl: `https://http2.mlstatic.com/D_NQ_NP_${p.product_name
          .toLowerCase()
          .split(" ")
          .slice(0, 2)
          .join("-")}.webp`,
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
          results.push(
            `Artigo "${article.title}": erro ao salvar - ${dbResult.error}`
          );
        } else {
          results.push(`✅ Artigo "${article.title}": criado com sucesso`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push(`Artigo viral: erro na geração - ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: results.join(" | "),
      count: results.filter((r) => r.includes("✅")).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
