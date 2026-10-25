import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getVideoById, updateVideoStatus } from "@/lib/video-orchestrator";
import { generateVideoScript } from "@/lib/script-generator";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json().catch(() => ({}));
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    if (!videoId) return NextResponse.json({ error: "videoId é obrigatório." }, { status: 400 });

    const video = await getVideoById(videoId);
    if (!video) return NextResponse.json({ error: "Vídeo não encontrado na fila." }, { status: 404 });

    if (typeof video.script_text === "string" && video.script_text.trim()) {
      try {
        const existing = JSON.parse(video.script_text);
        if (
          existing.generationVersion === 2 &&
          typeof existing.creativeAngle === "string" &&
          existing.creativeAngle.trim() &&
          Array.isArray(existing.scenes) &&
          existing.scenes.length >= 6
        ) {
          return NextResponse.json({ success: true, reused: true, videoId, script: existing });
        }
      } catch {
        // Replace a corrupted script only when a new script passes validation.
      }
    }

    const supabase = getSupabaseServiceKeyClient();
    const reviewSlug = (() => {
      try {
        const pathname = new URL(String(video.review_url || "")).pathname;
        return pathname.match(/^\/reviews\/([^/]+)\/?$/)?.[1] || null;
      } catch {
        return null;
      }
    })();

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
    const specs = parseArray(reviewFacts?.specs)
      .filter((item) => item && typeof item.label === "string" && typeof item.value === "string")
      .slice(0, 16);
    const specifications = Object.fromEntries(
      specs.map((item) => [item.label.trim().slice(0, 90), item.value.trim().slice(0, 300)])
    );
    const cleanText = (value: unknown, limit = 900) =>
      String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
    const editorialLines: string[] = [];
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
      "Custo-benefício real: explique o que os dados confirmados significam para o comprador, sem prometer economia.",
      "Perfil de uso: mostre para quem os recursos são relevantes e para quem talvez não façam diferença.",
      "Detalhe decisivo: construa o roteiro a partir de uma especificação confirmada que influencia a escolha.",
      "Trade-off honesto: conecte um ponto positivo documentado a uma limitação real, sem exagerar nenhum dos lados.",
      "Dúvida do comprador: responda uma pergunta concreta que as especificações e o review permitem esclarecer.",
      "Decisão em três critérios: priorize os fatores mais importantes deste modelo, não uma lista genérica.",
      "Confusão a evitar: esclareça uma diferença de versão ou recurso somente quando estiver documentada no review.",
      "Cenário de uso: relacione recursos confirmados a um caso de uso possível, sem afirmar que houve teste prático.",
      "O que vale conferir: destaque quais dados documentados resolvem a decisão e quais precisam ser confirmados no anúncio.",
      "Expectativa versus realidade: explique apenas as capacidades e limitações registradas, sem inventar resultados de testes."
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

    const script = await generateVideoScript({
      title: String(video.product_title || reviewFacts?.product || "Produto de tecnologia"),
      category: String(reviewFacts?.category || video.product_category || "Tecnologia"),
      price: String(reviewFacts?.price_new || video.product_price || "Consulte o preço atual"),
      marketplace: (video.product_url || "").toLowerCase().includes("amazon")
        ? "Amazon"
        : (video.product_url || "").toLowerCase().includes("shopee")
          ? "Shopee"
          : "Mercado Livre",
      specifications,
      editorialContext,
      creativeAngle,
      recentHooksToAvoid,
    });
    if (!script.hook || script.scenes.length < 6 || script.scenes.length > 7) {
      return NextResponse.json({ error: "Roteiro personalizado não passou pela validação de estrutura." }, { status: 422 });
    }
    const rawScore = Number(reviewFacts?.verdict_score ?? reviewFacts?.hero_overall_score);
    const finalScript = {
      ...script,
      generationVersion: 2 as const,
      creativeAngle,
      ...(Number.isFinite(rawScore) && rawScore > 0 && rawScore <= 10 ? { score: rawScore } : {}),
    };
    await updateVideoStatus(videoId, {
      script_text: JSON.stringify(finalScript),
      script_hook: finalScript.hook,
      error_message: null,
    });
    return NextResponse.json({
      success: true,
      reused: false,
      videoId,
      scenes: finalScript.scenes.length,
      creativeAngle,
      factsUsed: Object.keys(specifications).length,
      script: finalScript,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[generate-video-script] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
