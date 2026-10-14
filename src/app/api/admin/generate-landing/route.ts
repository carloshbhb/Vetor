import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProductLinkById, markProductLinkLandingPageGenerated } from "@/lib/product-links";
import { createReview, getAllReviewsAdmin } from "@/lib/supabase";
import { chatCompletion } from "@/lib/llm-provider";

type JsonObject = Record<string, unknown>;

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseModelJson(raw: string): JsonObject {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as JsonObject;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as JsonObject;
    }
  }
  throw new Error("O modelo não retornou um objeto JSON válido para a landing page.");
}

function asRecords(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const shortened = value.slice(0, max);
  const lastSpace = shortened.lastIndexOf(" ");
  return shortened.slice(0, lastSpace > max * 0.65 ? lastSpace : max).replace(/[\s.,;:]+$/, "");
}

export async function POST(req: NextRequest) {
  const cookieStore = req.cookies;
  const request = new Request("https://www.vetor.blog/admin/product-links-pending/", {
    headers: { cookie: cookieStore.toString() },
  });

  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const productId = typeof body.productId === "string" ? body.productId : "";
    const productName = typeof body.productName === "string" ? body.productName.trim() : "";

    if (!productId || !productName) {
      return NextResponse.json({ error: "productId e productName são obrigatórios" }, { status: 400 });
    }

    const link = await getProductLinkById(productId);
    if (!link) return NextResponse.json({ error: "Product link não encontrado" }, { status: 404 });

    const allContent = await getAllReviewsAdmin();
    if (link.landing_page_slug) {
      const existingLanding = allContent.find((item) => item.slug === link.landing_page_slug && item.content_type === "lp");
      if (existingLanding) {
        return NextResponse.json({
          success: true,
          slug: existingLanding.slug,
          url: `/reviews/${existingLanding.slug}/`,
          message: `Esta LP já existe: /reviews/${existingLanding.slug}/`,
        });
      }
    }

    const baseSlug = slugify(link.slug || productName).slice(0, 68).replace(/-+$/g, "");
    let slug = baseSlug.endsWith("-lp") ? baseSlug : `${baseSlug}-lp`;
    if (!slug || slug === "-lp") slug = `${slugify(productName).slice(0, 68)}-lp`;

    if (allContent.some((item) => item.slug === slug)) {
      return NextResponse.json({
        error: `Já existe conteúdo com o slug "${slug}". A LP não foi sobrescrita; confira a listagem de Landing Pages.`,
        slug,
      }, { status: 409 });
    }

    const sourceReview = allContent.find((item) =>
      item.content_type !== "lp" && item.slug === link.review_slug
    ) || allContent.find((item) =>
      item.content_type !== "lp" &&
      item.product.trim().toLocaleLowerCase("pt-BR") === productName.toLocaleLowerCase("pt-BR")
    );

    const sourceContext = sourceReview ? {
      title: sourceReview.product,
      category: sourceReview.category,
      specs: sourceReview.specs,
      sections: (sourceReview.sections || []).slice(0, 8).map((section) => ({
        heading: section.heading,
        content: String(section.content || "").slice(0, 700),
      })),
      pros: sourceReview.pros,
      cons: sourceReview.cons,
      comparison: sourceReview.compare_table,
      faq: (sourceReview.faq || []).slice(0, 5),
    } : {
      title: productName,
      category: link.category,
      availableDetails: "Não há review editorial associado. Use somente dados informados aqui; não invente especificações.",
    };

    const userPrompt = [
      "Crie uma landing page de produto em português do Brasil, com estrutura editorial e foco em ajudar uma decisão de compra.",
      "Dados confirmados do produto:",
      JSON.stringify({
        product: productName,
        category: link.category || "Geral",
        price: link.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(link.price) : null,
        image_url: link.image_url || sourceReview?.image_url || "",
        marketplace: link.marketplace || "mercadolivre",
        has_affiliate_link: Boolean(link.affiliate_url),
      }),
      "Contexto permitido para fundamentar a página (trate como fonte de fatos, não copie literalmente):",
      JSON.stringify(sourceContext),
      "Não afirme que houve testes físicos/laboratoriais. Não invente números, compatibilidades, certificações, preços de concorrentes ou recursos não presentes no contexto. Se um dado técnico não estiver confirmado, escreva 'não informado nas fontes disponíveis'. Diferencie fatos confirmados de orientações gerais de compra.",
      "Retorne exclusivamente JSON válido com estas chaves: meta_title (35-65 caracteres), meta_description (100-160 caracteres), hero_lead (2-3 frases concretas), headline (subtítulo), verdict_score (número de 0 a 10 apenas se houver contexto suficiente; senão 0), verdict_label, verdict_text, specs (mínimo 4 objetos label/value/highlight), sections (mínimo 4 objetos id/heading/tocEmoji/tocLabel/content; cada content com pelo menos 2 parágrafos substantivos separados por linha em branco, usando markdown simples), pros (mínimo 3 strings), cons (mínimo 2 strings honestas), compare_table (caption, columns e rows), faq (mínimo 3 objetos question/answer).",
      "Na comparação, columns deve começar com 'Critério' e conter o produto principal seguido por 1 ou 2 alternativas. Cada row precisa de feature, values (um valor por produto, sem a coluna Critério) e winner (índice de values ou -1). Não invente especificações de concorrentes; use 'verificar na ficha oficial' quando não houver fonte.",
      "A estrutura deve refletir uma landing page como esta: título e resumo; cards de destaques; ficha técnica em tabela; análise detalhada por seções; comparativo; prós e contras; FAQ; oferta e aviso de afiliados. O HTML será renderizado por um componente reutilizável, portanto não retorne HTML/CSS, apenas os dados estruturados.",
    ].join("\n\n");

    const raw = await chatCompletion({
      systemPrompt: "Você é editor técnico do Vetor.blog. Seja específico, útil, honesto e rigoroso com fatos. Produza conteúdo pronto para publicação sem frases promocionais vazias. A resposta deve ser JSON válido.",
      userPrompt,
      temperature: 0.35,
      maxTokens: 6000,
      responseFormat: { type: "json_object" },
    });
    const generated = parseModelJson(raw);

    const specs = asRecords(generated.specs).flatMap((spec) => {
      const label = asText(spec.label);
      const value = asText(spec.value);
      return label && value ? [{ label, value, highlight: Boolean(spec.highlight) }] : [];
    });
    const sections = asRecords(generated.sections).flatMap((section, index) => {
      const heading = asText(section.heading);
      const content = asText(section.content);
      if (!heading || content.length < 120) return [];
      return [{
        id: slugify(asText(section.id, heading)) || `secao-${index + 1}`,
        heading,
        tocEmoji: asText(section.tocEmoji),
        tocLabel: asText(section.tocLabel, heading),
        content,
      }];
    });
    const pros = asStrings(generated.pros);
    const cons = asStrings(generated.cons);
    const faq = asRecords(generated.faq).flatMap((item) => {
      const question = asText(item.question);
      const answer = asText(item.answer);
      return question && answer ? [{ question, answer }] : [];
    });
    const rawCompare = generated.compare_table && typeof generated.compare_table === "object"
      ? generated.compare_table as JsonObject
      : {};
    const compareColumns = asStrings(rawCompare.columns);
    const compareRows = asRecords(rawCompare.rows).flatMap((row) => {
      const feature = asText(row.feature);
      const values = asStrings(row.values);
      if (!feature || compareColumns.length < 3 || values.length !== compareColumns.length - 1) return [];
      const winner = Number.isInteger(row.winner) && Number(row.winner) >= -1 && Number(row.winner) < values.length
        ? Number(row.winner)
        : -1;
      return [{ feature, values, winner }];
    });

    const issues: string[] = [];
    if (asText(generated.meta_title).length < 20) issues.push("meta_title ausente ou curto");
    if (asText(generated.meta_description).length < 80) issues.push("meta_description ausente ou curta");
    if (asText(generated.hero_lead).length < 100) issues.push("resumo principal insuficiente");
    if (specs.length < 4) issues.push("a ficha técnica precisa de pelo menos 4 itens");
    if (sections.length < 4) issues.push("a análise precisa de pelo menos 4 seções substanciais");
    if (pros.length < 3) issues.push("faltam prós suficientes");
    if (cons.length < 2) issues.push("faltam limitações honestas");
    if (faq.length < 3) issues.push("FAQ precisa de pelo menos 3 perguntas");
    if (compareColumns.length < 3 || compareColumns.length > 4 || !compareColumns[0].toLowerCase().includes("crit")) {
      issues.push("comparativo precisa de Critério, produto e pelo menos uma alternativa");
    }
    if (compareRows.length < 3) issues.push("comparativo precisa de pelo menos 3 linhas válidas");
    if (issues.length) {
      return NextResponse.json({
        error: "A geração não passou pela validação de qualidade. Nenhuma LP foi salva.",
        issues,
      }, { status: 422 });
    }

    const priceText = link.price
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(link.price)
      : "Consulte o preço";
    const imageUrl = link.image_url || sourceReview?.image_url || "";
    if (!imageUrl) {
      return NextResponse.json({ error: "O produto não tem imagem válida para a landing page." }, { status: 422 });
    }

    const landingPage = {
      slug,
      content_type: "lp" as const,
      status: "draft",
      product: productName,
      category: link.category || "Geral",
      price_new: priceText,
      meta_title: clip(asText(generated.meta_title), 65),
      meta_description: clip(asText(generated.meta_description), 160),
      meta_canonical: `https://www.vetor.blog/reviews/${slug}/`,
      hero_overall_score: Number.isFinite(Number(generated.verdict_score))
        ? Math.max(0, Math.min(10, Number(generated.verdict_score)))
        : 0,
      verdict_score: Number.isFinite(Number(generated.verdict_score))
        ? Math.max(0, Math.min(10, Number(generated.verdict_score)))
        : 0,
      verdict_label: asText(generated.verdict_label, "Análise técnica"),
      verdict_text: asText(generated.verdict_text, asText(generated.hero_lead)),
      verdict_note: "Landing page gerada com conteúdo estruturado e validação mínima de qualidade.",
      hero_lead: asText(generated.hero_lead),
      hero_headline_line1: productName,
      hero_headline_line2: asText(generated.headline, "Ficha técnica, recursos e avaliação"),
      hero_headline_em: "",
      marketplace: link.marketplace || "mercadolivre",
      affiliate_url: link.affiliate_url || link.product_url || "",
      image_url: imageUrl,
      specs,
      sections,
      pros,
      cons,
      faq,
      compare_table: {
        caption: asText(rawCompare.caption, `Comparativo de ${productName} com alternativas`),
        columns: compareColumns,
        rows: compareRows,
        winnerCol: Number.isInteger(rawCompare.winnerCol) ? Number(rawCompare.winnerCol) : -1,
      },
      hero_bars: [],
    };

    const result = await createReview(landingPage, { insertOnly: true });
    if (result.error) {
      return NextResponse.json({ error: "Falha ao salvar landing page: " + result.error }, { status: 500 });
    }

    const association = await markProductLinkLandingPageGenerated(link.id, slug);
    if (association.error) {
      console.error("[generate-landing] LP salva, mas não foi possível vincular ao product link:", association.error);
    }

    return NextResponse.json({
      success: true,
      slug,
      url: `/reviews/${slug}/`,
      message: `Landing page criada como rascunho em /reviews/${slug}/. Revise as informações e publique no painel de Landing Pages.`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error in generate-landing:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido na geração.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}