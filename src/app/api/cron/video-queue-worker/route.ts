import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

const UPDATABLE_FIELDS = new Set([
  "status",
  "error_message",
  "started_at",
  "completed_at",
  "script_text",
  "script_hook",
  "voiceover_url",
  "voiceover_duration",
  "media_assets",
  "video_url",
  "youtube_video_id",
  "youtube_url",
]);

function buildReviewVideoScript(input: {
  title: string;
  category: string;
  price: string;
  reviewUrl: string;
}) {
  const { title, category, price, reviewUrl } = input;
  return {
    hook: `Antes de comprar ${title}, confira a versão exata, a compatibilidade e os detalhes do anúncio.`,
    scenes: [
      {
        id: 1,
        text: `Antes de escolher ${title}, confira a versão exata, a compatibilidade e o que acompanha o produto. Esses detalhes ajudam a evitar comparar anúncios diferentes.`,
        duration: 8,
        visualCue: "Produto em destaque e checklist de compra",
        brollKeywords: ["product close up", "unboxing product"],
      },
      {
        id: 2,
        text: `${title} está na categoria ${category}. Consulte o review do Vetor.blog para ver os critérios que devem entrar na sua comparação.`,
        duration: 8,
        visualCue: "Produto com identificação da categoria",
        brollKeywords: ["product review setup", "product on desk"],
      },
      {
        id: 3,
        text: `O preço registrado no review é ${price}. Preço, frete e disponibilidade mudam; confira o anúncio atualizado antes de finalizar a compra.`,
        duration: 8,
        visualCue: "Preço e aviso para confirmar a oferta",
        brollKeywords: ["online shopping", "product listing"],
      },
      {
        id: 4,
        text: "Compare ficha técnica, compatibilidade, garantia e política de devolução com outras opções da mesma categoria. A escolha depende do seu uso.",
        duration: 8,
        visualCue: "Checklist de comparação",
        brollKeywords: ["product comparison", "shopping checklist"],
      },
      {
        id: 5,
        text: "Não presuma recursos apenas pelo nome do modelo. Confirme as especificações na ficha oficial e no anúncio exato antes de comprar.",
        duration: 8,
        visualCue: "Foco em ficha técnica e versão do produto",
        brollKeywords: ["product specifications", "product details"],
      },
      {
        id: 6,
        text: `Acesse o review completo de ${title} e consulte o link de compra na descrição. Verifique preço e condições atuais antes de pagar.`,
        duration: 7,
        visualCue: "Tela final com chamada para review e compra",
        brollKeywords: ["product shot", "product review"],
      },
    ],
    totalDuration: 47,
    callToAction: `Review completo: ${reviewUrl}. Link de compra na descrição; confira as condições atuais antes de comprar.`,
  };
}

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Supabase service client não configurado no Vetor." }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "queueFromReviews") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 10);
      const { data: reviews, error: reviewError } = await supabase
        .from("reviews")
        .select("slug,product,category,price_new,image_url,affiliate_url,updated_at")
        .eq("status", "published")
        .not("affiliate_url", "is", null)
        .not("image_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (reviewError) throw reviewError;

      const { data: existing, error: existingError } = await supabase
        .from("video_queue")
        .select("review_url,status")
        .in("status", ["pending", "processing", "completed"]);
      if (existingError) throw existingError;

      const existingUrls = new Set((existing || []).map((item) => item.review_url).filter(Boolean));
      const candidates = (reviews || []).filter((item) =>
        typeof item.slug === "string" &&
        typeof item.product === "string" && item.product.trim().length > 0 &&
        typeof item.affiliate_url === "string" && /^https?:\/\//i.test(item.affiliate_url) &&
        typeof item.image_url === "string" && /^https?:\/\//i.test(item.image_url) &&
        !existingUrls.has(`https://www.vetor.blog/reviews/${item.slug}/`)
      ).slice(0, limit);

      const queued = [];
      for (const item of candidates) {
        const price = typeof item.price_new === "string" && item.price_new.trim()
          ? item.price_new.trim()
          : "consulte o preço atual";
        const category = typeof item.category === "string" && item.category.trim()
          ? item.category.trim()
          : "Tecnologia";
        const title = item.product.trim();
        const reviewUrl = `https://www.vetor.blog/reviews/${item.slug}/`;
        const script = buildReviewVideoScript({ title, category, price, reviewUrl });

        const { data: inserted, error: insertError } = await supabase
          .from("video_queue")
          .insert({
            product_url: item.affiliate_url,
            product_title: title,
            product_category: category,
            product_price: item.price_new || "Consulte o preço atual",
            product_image_url: item.image_url,
            affiliate_url: item.affiliate_url,
            shortened_affiliate_url: item.affiliate_url,
            script_text: JSON.stringify(script),
            script_hook: script.hook,
            voiceover_url: "",
            voiceover_duration: 0,
            media_assets: [],
            status: "pending",
            review_url: reviewUrl,
            scheduled_at: new Date().toISOString(),
          })
          .select("id,product_title,status,review_url,affiliate_url")
          .single();
        if (insertError) throw insertError;
        queued.push(inserted);
        existingUrls.add(reviewUrl);
      }
      return NextResponse.json({ success: true, queued: queued.length, videos: queued });
    }

    if (action === "queueFromComparatives") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 10);
      const { data: articles, error: articlesError } = await supabase
        .from("viral_articles")
        .select("slug,title,category,products,published_at,updated_at")
        .order("published_at", { ascending: false })
        .limit(200);
      if (articlesError) throw articlesError;

      const { data: existing, error: existingError } = await supabase
        .from("video_queue")
        .select("review_url,status")
        .in("status", ["pending", "processing", "completed"]);
      if (existingError) throw existingError;
      const existingUrls = new Set((existing || []).map((item) => item.review_url).filter(Boolean));

      const candidates = (articles || []).filter((article) => {
        if (typeof article.slug !== "string" || !article.slug.trim()) return false;
        if (typeof article.title !== "string" || !article.title.trim()) return false;
        let products: unknown = article.products;
        if (typeof products === "string") {
          try { products = JSON.parse(products); } catch { return false; }
        }
        if (!Array.isArray(products) || products.length < 2) return false;
        const validProducts = products.slice(0, 2).every((product: any) => {
          if (!product || typeof product.name !== "string" || !product.name.trim()) return false;
          try {
            const image = new URL(String(product.imageUrl || ""));
            return image.protocol === "https:" || image.protocol === "http:";
          } catch {
            return false;
          }
        });
        if (!validProducts) return false;
        return !existingUrls.has(`https://www.vetor.blog/comparativos/${article.slug}/`);
      }).slice(0, limit);

      const queued = [];
      for (const article of candidates) {
        let products: any[] = Array.isArray(article.products) ? article.products : [];
        if (typeof article.products === "string") {
          try { products = JSON.parse(article.products); } catch { products = []; }
        }
        if (products.length < 2) continue;
        const first = products[0];
        const second = products[1];
        const category = typeof article.category === "string" && article.category.trim()
          ? article.category.trim()
          : "Tecnologia";
        const title = `${first.name} vs ${second.name}`;
        const comparisonUrl = `https://www.vetor.blog/comparativos/${article.slug}/`;
        const purchaseUrl = typeof first.product_url === "string" && /^https?:\\/\\//i.test(first.product_url)
          ? first.product_url
          : comparisonUrl;
        const script = {
          type: "comparison",
          hook: `Antes de escolher entre ${first.name} e ${second.name}, compare os recursos documentados e as condições atuais.`,
          callToAction: `Veja o comparativo completo em ${comparisonUrl} e confira os anúncios dos produtos.`,
        };

        const { data: inserted, error: insertError } = await supabase
          .from("video_queue")
          .insert({
            product_url: purchaseUrl,
            product_title: title,
            product_category: category,
            product_price: "Consulte os preços atuais dos anúncios",
            product_image_url: first.imageUrl,
            affiliate_url: purchaseUrl,
            shortened_affiliate_url: purchaseUrl,
            script_text: JSON.stringify(script),
            script_hook: script.hook,
            voiceover_url: "",
            voiceover_duration: 0,
            media_assets: [],
            status: "pending",
            review_url: comparisonUrl,
            scheduled_at: new Date().toISOString(),
          })
          .select("id,product_title,status,review_url,affiliate_url")
          .single();
        if (insertError) throw insertError;
        queued.push({ ...inserted, type: "comparison" });
        existingUrls.add(comparisonUrl);
      }
      return NextResponse.json({ success: true, queued: queued.length, videos: queued });
    }

    if (action === "next") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 10);
      const { data, error } = await supabase
        .from("video_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ success: true, videos: data || [] });
    }

    if (action === "get") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return NextResponse.json({ success: false, error: "id é obrigatório." }, { status: 400 });
      const { data, error } = await supabase.from("video_queue").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return NextResponse.json({ success: true, video: data || null });
    }

    if (action === "update") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const updates = body.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
        ? body.updates as Record<string, unknown>
        : null;
      if (!id || !updates) return NextResponse.json({ success: false, error: "id e updates são obrigatórios." }, { status: 400 });
      const safeUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (UPDATABLE_FIELDS.has(key)) safeUpdates[key] = value;
      }
      if (Object.keys(safeUpdates).length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum campo permitido para atualização." }, { status: 400 });
      }
      safeUpdates.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("video_queue")
        .update(safeUpdates)
        .eq("id", id)
        .select("id,status,updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: "Vídeo não encontrado na fila." }, { status: 404 });
      return NextResponse.json({ success: true, video: data });
    }

    if (action === "recent") {
      const { data, error } = await supabase
        .from("video_queue")
        .select("id,product_title,status,review_url,affiliate_url,youtube_url,error_message,updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return NextResponse.json({ success: true, videos: data || [] });
    }

    return NextResponse.json({ success: false, error: "Ação inválida. Use queueFromReviews, queueFromComparatives, next, get, update ou recent." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[video-queue-worker] failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
