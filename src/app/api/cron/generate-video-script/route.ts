import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getVideoById, updateVideoStatus } from "@/lib/video-orchestrator";
import { generateComparisonVideoScript, generateVideoScript } from "@/lib/script-generator";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { getProductWithPictures } from "@/lib/mercadolivre-api";
import { dedupeMercadoLivreImages, extractMercadoLivreItemId, findBestMercadoLivreItemMatch, scoreProductTitleMatch } from "@/lib/video-media-matching";

export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json().catch(() => ({}));
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    if (!videoId) return NextResponse.json({ error: "videoId é obrigatório." }, { status: 400 });

    const video = await getVideoById(videoId);
    if (!video) return NextResponse.json({ error: "Vídeo não encontrado na fila." }, { status: 404 });

    const existingMediaAssets = Array.isArray(video.media_assets) ? video.media_assets : [];
    const formatAsset = existingMediaAssets.find((asset: any) => asset && asset.type === "publication_format");
    const videoFormat = formatAsset?.format === "long" ? "long" : "short";

    let cachedScript: any = null;
    if (typeof video.script_text === "string" && video.script_text.trim()) {
      try {
        const existing = JSON.parse(video.script_text);
        if (
          existing.generationVersion === 3 &&
          existing.videoFormat === videoFormat &&
          typeof existing.creativeAngle === "string" &&
          existing.creativeAngle.trim() &&
          Array.isArray(existing.scenes) &&
          existing.scenes.length >= 6
        ) {
          cachedScript = existing;
        }
      } catch {
        // Regenerate corrupted or incomplete JSON.
      }
    }

    const supabase = getSupabaseServiceKeyClient();
    const parseArray = (value: unknown): any[] => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      }
      return [];
    };
    const contentPath = (() => {
      try { return new URL(String(video.review_url || "")).pathname; }
      catch { return ""; }
    })();
    const comparisonSlug = contentPath.match(/^\/comparativos\/([^/]+)\/?$/)?.[1] || null;

    if (comparisonSlug) {
      if (!supabase) {
        return NextResponse.json({ error: "Supabase Service Role indisponível para ler o comparativo publicado." }, { status: 503 });
      }
      const { data: article, error: articleError } = await supabase
        .from("viral_articles")
        .select("slug,title,category,products,published_at")
        .eq("slug", comparisonSlug)
        .maybeSingle();
      if (articleError) throw articleError;
      if (!article || !article.published_at) {
        return NextResponse.json({ error: "Comparativo publicado não encontrado para gerar o roteiro." }, { status: 404 });
      }
      const products = parseArray(article.products).slice(0, 2)
        .filter((product) => product && typeof product.name === "string" && product.name.trim());
      if (products.length !== 2 || products[0].name.trim() === products[1].name.trim()) {
        return NextResponse.json({ error: "Comparativo precisa conter exatamente dois produtos distintos com nomes válidos." }, { status: 422 });
      }

      if (cachedScript?.contentType === "comparison" && cachedScript.videoFormat === "short") {
        return NextResponse.json({ success: true, reused: true, videoId, contentType: "comparison", productImages: [], script: cachedScript });
      }

      const comparisonScript = await generateComparisonVideoScript({
        title: String(article.title || video.product_title || "Comparativo de produtos"),
        category: String(article.category || video.product_category || "Tecnologia"),
        product1: { name: products[0].name.trim() },
        product2: { name: products[1].name.trim() },
        comparisonUrl: "https://www.vetor.blog/comparativos/" + comparisonSlug + "/",
      });
      const finalComparisonScript = {
        ...comparisonScript,
        generationVersion: 3 as const,
        videoFormat: "short" as const,
        creativeAngle: comparisonScript.creativeAngle || "Comparação factual baseada somente nos nomes e na categoria fornecidos.",
        contentType: "comparison" as const,
      };
      await updateVideoStatus(videoId, {
        script_text: JSON.stringify(finalComparisonScript),
        script_hook: finalComparisonScript.hook,
        error_message: null,
      });
      return NextResponse.json({
        success: true,
        reused: false,
        videoId,
        contentType: "comparison",
        scenes: finalComparisonScript.scenes.length,
        factsUsed: 2,
        script: finalComparisonScript,
      });
    }

    const reviewSlug = contentPath.match(/^\/reviews\/([^/]+)\/?$/)?.[1] || null;
    const socialListMarker = existingMediaAssets.find((asset: any) => asset && asset.type === "ml-social-list-item") || null;
    const socialListItemId = extractMercadoLivreItemId(socialListMarker?.itemId || video.product_url);

    let reviewFacts: any = null;
    if (supabase && reviewSlug) {
      const { data, error } = await supabase
        .from("reviews")
        .select("slug,product,category,price_old,price_new,specs,sections,pros,cons,verdict_text,verdict_note,hero_lead,meta_description,faq,verdict_score,hero_overall_score")
        .eq("slug", reviewSlug)
        .eq("status", "published")
        .maybeSingle();
      if (error) {
        console.warn("[generate-video-script] review facts lookup failed:", error.message);
      } else {
        reviewFacts = data;
      }
    }

    let selectedProductRow: any = null;
    let socialListItem: any = null;
    const galleryUrls: string[] = [];
    let resolvedItemId: string | null = socialListItemId || extractMercadoLivreItemId(video.product_url);

    try {
      if (supabase) {
        if (socialListItemId) {
          const { data: listItem, error: listItemError } = await supabase
            .from("ml_social_list_items")
            .select("item_id,title,product_url,image_url,price,rating,review_count,highlight,last_seen_at")
            .eq("item_id", socialListItemId)
            .maybeSingle();
          if (listItemError) {
            console.warn("[generate-video-script] Social List item lookup failed:", listItemError.message);
          } else {
            socialListItem = listItem;
          }
        }

        let productQuery = supabase.from("product_links")
          .select("id,product_name,product_url,image_url,marketplace,category,price,updated_at,tags");
        if (reviewSlug) {
          productQuery = productQuery.eq("review_slug", reviewSlug);
        } else if (typeof socialListMarker?.productLinkId === "string" && socialListMarker.productLinkId) {
          productQuery = productQuery.eq("id", socialListMarker.productLinkId);
        } else if (socialListItemId) {
          productQuery = productQuery.contains("tags", ["ml-social-item:" + socialListItemId]);
        } else {
          productQuery = productQuery.eq("product_name", video.product_title);
        }
        const { data: productRows, error: productError } = await productQuery
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(10);
        if (productError) {
          console.warn("[generate-video-script] product link lookup failed:", productError.message);
        }

        const rows = (productRows || []) as any[];
        const exactRows = rows.filter((row) =>
          String(row.product_name || "").trim().toLowerCase() === String(video.product_title || "").trim().toLowerCase()
        );
        const exactItemIds = new Set(exactRows.map((row) => extractMercadoLivreItemId(row.product_url)).filter(Boolean));
        const exactRow = exactRows.length === 1
          ? exactRows[0]
          : exactRows.length > 1 && exactItemIds.size === 1
            ? exactRows[0]
            : null;
        const scoredRows = rows
          .map((row) => ({ row, score: scoreProductTitleMatch(video.product_title, row.product_name) }))
          .filter((item) => item.score)
          .sort((a, b) => Number(b.score?.confidence || 0) - Number(a.score?.confidence || 0));
        selectedProductRow = exactRow || (rows.length === 1 ? rows[0] : null);
        if (!selectedProductRow && scoredRows.length) {
          const topConfidence = scoredRows[0].score?.confidence || 0;
          const tiedRows = scoredRows.filter((item) => Math.abs((item.score?.confidence || 0) - topConfidence) < 0.0001);
          const tiedItemIds = new Set(tiedRows.map((item) => extractMercadoLivreItemId(item.row.product_url)).filter(Boolean));
          if (tiedRows.length === 1 || (tiedItemIds.size === 1 && tiedItemIds.has(extractMercadoLivreItemId(tiedRows[0].row.product_url)))) {
            selectedProductRow = tiedRows[0].row;
          }
        }

        if (!resolvedItemId && selectedProductRow) {
          resolvedItemId = extractMercadoLivreItemId(selectedProductRow.product_url);
        }

        if (!resolvedItemId && (selectedProductRow?.product_name || video.product_title)) {
          const { data: listItems, error: listError } = await supabase
            .from("ml_social_list_items")
            .select("item_id,product_id,title,product_url,image_url,last_seen_at")
            .order("last_seen_at", { ascending: false })
            .limit(500);
          if (listError) {
            console.warn("[generate-video-script] Mercado Livre list lookup failed:", listError.message);
          } else {
            const match = findBestMercadoLivreItemMatch(
              String(selectedProductRow?.product_name || video.product_title),
              (listItems || []) as any[]
            );
            if (match) resolvedItemId = extractMercadoLivreItemId(match.candidate.item_id || match.candidate.product_url);
          }
        }
      }

      if (resolvedItemId) {
        const product = await getProductWithPictures(resolvedItemId);
        const pictureUrls = Array.isArray(product.pictures)
          ? product.pictures.flatMap((picture) => [picture.secure_url, picture.url])
          : [];
        galleryUrls.push(...dedupeMercadoLivreImages(pictureUrls, 5));
        console.log("[generate-video-script] Mercado Livre gallery resolved:", resolvedItemId, galleryUrls.length);
      }
    } catch (error) {
      console.warn("[generate-video-script] Product gallery is unavailable; using verified primary image only:",
        error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240));
    }

    const primaryImage = String(video.product_image_url || socialListItem?.image_url || selectedProductRow?.image_url || "").trim();
    const primaryUrl = primaryImage.startsWith("http://") ? primaryImage.replace(/^http:/, "https:") : primaryImage;
    const primaryImages = primaryUrl.startsWith("https://") ? [primaryUrl] : [];
    const productImages = [...new Set([...primaryImages, ...galleryUrls])]
      .filter((url) => typeof url === "string" && url.startsWith("https://"))
      .slice(0, 5);
    const mediaAssets = [
      ...existingMediaAssets.filter((asset: any) => asset && asset.type !== "product-gallery-image"),
      ...productImages.slice(1).map((url, index) => ({
        type: "product-gallery-image",
        source: "mercadolivre-api",
        itemId: resolvedItemId,
        index: index + 1,
        url,
      })),
    ];

    const specs = parseArray(reviewFacts?.specs)
      .filter((item) => item && typeof item.label === "string" && typeof item.value === "string")
      .slice(0, 16);
    const specifications = Object.fromEntries(
      specs.map((item) => [item.label.trim().slice(0, 90), item.value.trim().slice(0, 300)])
    );
    const cleanText = (value: unknown, limit = 900) =>
      String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
    const editorialLines: string[] = [];
    if (socialListItem) {
      editorialLines.push("Origem: produto da Lista Social do Mercado Livre; dados do anúncio/lista, não teste prático.");
      if (socialListItem.highlight) editorialLines.push("Destaque exibido na lista: " + cleanText(socialListItem.highlight, 100));
      if (Number.isFinite(Number(socialListItem.price)) && Number(socialListItem.price) > 0) {
        editorialLines.push("Preço exibido na lista (pode mudar): R$ " + Number(socialListItem.price).toFixed(2));
      }
      if (Number.isFinite(Number(socialListItem.rating)) && Number(socialListItem.rating) > 0) {
        editorialLines.push("Nota exibida pelo Mercado Livre: " + Number(socialListItem.rating).toFixed(2));
      }
      if (Number.isFinite(Number(socialListItem.review_count)) && Number(socialListItem.review_count) > 0) {
        editorialLines.push("Quantidade de avaliações exibida pelo Mercado Livre: " + Number(socialListItem.review_count));
      }
    }
    if (reviewFacts?.hero_lead) editorialLines.push("Resumo editorial: " + cleanText(reviewFacts.hero_lead, 700));
    if (reviewFacts?.meta_description) editorialLines.push("Resumo do review: " + cleanText(reviewFacts.meta_description, 500));
    for (const item of specs) editorialLines.push("Especificação confirmada — " + cleanText(item.label, 90) + ": " + cleanText(item.value, 260));
    for (const value of parseArray(reviewFacts?.pros).slice(0, 5)) editorialLines.push("Ponto positivo descrito no review: " + cleanText(value, 250));
    for (const value of parseArray(reviewFacts?.cons).slice(0, 5)) editorialLines.push("Ressalva descrita no review: " + cleanText(value, 250));
    if (reviewFacts?.verdict_text) editorialLines.push("Veredito editorial: " + cleanText(reviewFacts.verdict_text, 1000));
    if (reviewFacts?.verdict_note) editorialLines.push("Nota do veredito: " + cleanText(reviewFacts.verdict_note, 500));
    for (const section of parseArray(reviewFacts?.sections).slice(0, 7)) {
      if (section?.heading || section?.content) {
        editorialLines.push(
          cleanText(section.heading || "Trecho do review", 120) + ": " + cleanText(section.content, 650)
        );
      }
    }
    for (const faq of parseArray(reviewFacts?.faq).slice(0, 3)) {
      if (faq?.question && faq?.answer) {
        editorialLines.push("Pergunta respondida no review: " + cleanText(faq.question, 180) + " — " + cleanText(faq.answer, 280));
      }
    }
    const editorialContext = editorialLines.join("\n").slice(0, 6500);

    const angles = [
      "Pergunta que trava a compra: responda à dúvida mais importante usando fatos documentados.",
      "Custo-benefício com contexto: explique o que o comprador recebe e o que ainda precisa comparar.",
      "Para quem vale e para quem não vale: diferencie perfis de uso sem inventar experiência.",
      "O detalhe que muda a decisão: coloque uma especificação confirmada no centro do roteiro.",
      "Trade-off honesto: contraste vantagem e limitação real e explique a consequência prática.",
      "Custo total: destaque acessórios, compatibilidade e garantia somente quando documentados.",
      "Alternativa a considerar: explique quais critérios comparar sem declarar vencedor sem dados.",
      "Expectativa versus realidade: separe fatos confirmados de pontos que precisam ser conferidos.",
      "Decisão em três critérios: priorize fatores específicos deste produto.",
      "Compra consciente: organize fatos, limitações e verificações antes da compra."
    ];
    const seed = videoId + ":" + String(video.product_title || "");
    const angleIndex = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % angles.length;
    const creativeAngle = angles[angleIndex];

    let recentHooksToAvoid: string[] = [];
    if (supabase) {
      const { data: recent, error } = await supabase
        .from("video_queue")
        .select("script_hook")
        .eq("status", "completed")
        .neq("id", videoId)
        .not("script_hook", "is", null)
        .order("completed_at", { ascending: false })
        .limit(12);
      if (!error && recent) {
        recentHooksToAvoid = recent
          .map((item) => String(item.script_hook || "").trim())
          .filter(Boolean);
      }
    }

    if (cachedScript && cachedScript.contentType !== "comparison") {
      await updateVideoStatus(videoId, { media_assets: mediaAssets });
      return NextResponse.json({
        success: true,
        reused: true,
        videoId,
        script: cachedScript,
        productImages,
        galleryCount: productImages.length,
      });
    }

    const researchBrief = typeof body.researchBrief === "string" ? body.researchBrief : undefined;
    const script = await generateVideoScript({
      title: String(video.product_title || reviewFacts?.product || "Produto de tecnologia"),
      category: String(reviewFacts?.category || selectedProductRow?.category || video.product_category || "Tecnologia"),
      price: String(socialListItem?.price || reviewFacts?.price_new || selectedProductRow?.price || video.product_price || "Consulte o preço atual"),
      marketplace: (video.product_url || "").toLowerCase().includes("amazon")
        ? "Amazon"
        : (video.product_url || "").toLowerCase().includes("shopee")
          ? "Shopee"
          : "Mercado Livre",
      specifications,
      editorialContext,
      creativeAngle,
      recentHooksToAvoid,
      videoFormat,
      researchBrief,
    });
    const minScenes = videoFormat === "long" ? 8 : 6;
    const maxScenes = videoFormat === "long" ? 10 : 7;
    if (!script.hook || script.scenes.length < minScenes || script.scenes.length > maxScenes) {
      return NextResponse.json({ error: "Roteiro personalizado não passou pela validação de estrutura." }, { status: 422 });
    }
    const rawScore = Number(reviewFacts?.verdict_score ?? reviewFacts?.hero_overall_score);
    const finalScript = {
      ...script,
      generationVersion: 3 as const,
      videoFormat,
      creativeAngle,
      ...(Number.isFinite(rawScore) && rawScore > 0 && rawScore <= 10 ? { score: rawScore } : {}),
    };
    await updateVideoStatus(videoId, {
      script_text: JSON.stringify(finalScript),
      script_hook: finalScript.hook,
      media_assets: mediaAssets,
      error_message: null,
    });
    return NextResponse.json({
      success: true,
      reused: false,
      videoId,
      scenes: finalScript.scenes.length,
      creativeAngle,
      factsUsed: Object.keys(specifications).length,
      productImages,
      galleryCount: productImages.length,
      script: finalScript,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[generate-video-script] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
