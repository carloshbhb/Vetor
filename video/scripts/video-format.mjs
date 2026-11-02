export function resolveVideoFormat(mediaAssets) {
  if (!Array.isArray(mediaAssets)) return "short";
  const row = mediaAssets.find((asset) => asset && typeof asset === "object" && asset.type === "publication_format");
  return row && row.format === "long" ? "long" : "short";
}

export function formatYouTubeTimestamp(value) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0")
    : minutes + ":" + String(remainder).padStart(2, "0");
}

export function buildCaptionEntries(segments, maxWords = 7) {
  const limit = Math.min(10, Math.max(3, Math.floor(Number(maxWords) || 7)));
  return (Array.isArray(segments) ? segments : []).flatMap((segment) => {
    const words = String(segment?.text || "").trim().split(/\s+/).filter(Boolean);
    const start = Number(segment?.start);
    const end = Number(segment?.end);
    if (!words.length || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    const duration = end - start;
    const chunks = [];
    for (let index = 0; index < words.length; index += limit) {
      const next = Math.min(words.length, index + limit);
      chunks.push({
        start: start + duration * index / words.length,
        end: start + duration * next / words.length,
        text: words.slice(index, next).join(" "),
      });
    }
    return chunks;
  });
}

export function buildVideoTitle(input) {
  const productTitle = String(input.productTitle || "Produto de tecnologia").trim();
  const hook = String(input.hook || "").trim().replace(/[.!?]+$/, "");
  return input.format === "long"
    ? (productTitle + ": vale a pena? Análise completa | Vetor.blog").slice(0, 100)
    : ((hook || "Vale a pena comprar?") + " | " + productTitle + " #Shorts").slice(0, 100);
}

export function buildVideoDescription(input) {
  const productTitle = String(input.productTitle || "Produto").trim();
  const category = String(input.category || "Tecnologia").trim();
  const hook = String(input.hook || "").trim();
  const purchaseUrl = String(input.purchaseUrl || "").trim();
  const reviewUrl = String(input.reviewUrl || "").trim();
  const highlights = [...new Set((Array.isArray(input.highlights) ? input.highlights : [])
    .map((item) => String(item || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean))]
    .slice(0, 5)
    .map((item) => "• " + item.slice(0, 190));

  const chapters = (input.chapters || [])
    .filter((chapter) => Number.isFinite(chapter.time) && chapter.time >= 0 && String(chapter.title || "").trim())
    .sort((a, b) => a.time - b.time)
    .filter((chapter, index, list) => index === 0 || chapter.time - list[index - 1].time >= 10)
    .map((chapter) => formatYouTubeTimestamp(chapter.time) + " " + String(chapter.title).replace(/[\r\n]+/g, " ").slice(0, 70));
  if (chapters.length && !chapters[0].startsWith("0:00 ")) chapters.unshift("0:00 Introdução e decisão de compra");

  const opening = input.format === "short"
    ? productTitle + ": vale a pena comprar? Veja os pontos importantes antes de escolher."
    : productTitle + ": análise, review e orientação de compra.";
  const lines = [
    opening,
    hook,
    "",
    "🛒 LINK PARA CONFERIR PREÇO E OFERTA: " + purchaseUrl,
    "📝 " + (reviewUrl.includes("/comparativos/") ? "COMPARATIVO COMPLETO" : "REVIEW COMPLETO") + ": " + reviewUrl,
    "",
    "Esta análise de " + productTitle + " (" + category + ") reúne os critérios que mais pesam na decisão de compra: recursos, limitações, compatibilidade e custo-benefício. Consulte o conteúdo completo e confira as condições atuais do anúncio antes de fechar o pedido.",
  ];

  if (highlights.length) {
    lines.push("", "🔎 PRINCIPAIS PONTOS ABORDADOS NO VÍDEO:", ...highlights);
  }
  if (chapters.length) {
    lines.push("", "CAPÍTULOS:", ...chapters);
  }

  lines.push(
    "",
    String(input.callToAction || ("Acesse o link acima para consultar a oferta de " + productTitle + " e leia a análise completa antes de comprar.")).trim(),
    "Antes de finalizar, confira a versão exata, preço final, frete, prazo de entrega, disponibilidade, garantia e política de devolução do anúncio.",
  );

  if (input.format === "short") {
    lines.push(
      "Em Shorts, links externos na descrição não são clicáveis. Se o endereço não abrir ao tocar, copie o link ou acesse os links disponíveis no perfil do canal.",
    );
  }
  lines.push(
    "",
    "Aviso: alguns links podem ser afiliados. Isso não altera os critérios editoriais nem o teor da análise.",
    "",
    "#Review #ValeAPena #CompraInteligente #MercadoLivre #VetorBlog",
  );

  return lines.filter((line, index) => line || (index > 0 && lines[index - 1] !== "")).join("\n").slice(0, 4800);
}

export function buildCtaComment(input) {
  if (input.format === "short") {
    return [
      "👇 Quer decidir se " + input.productTitle + " combina com seu uso?",
      "A análise completa e as ofertas estão no link do perfil do Quick Review Brasil.",
      "Qual critério você gostaria de ver comparado? Participe da conversa.",
    ].join("\n");
  }
  return [
    "👇 Quer conferir o preço e analisar " + input.productTitle + " antes de comprar?",
    "",
    "🛒 Link para conferir a oferta: " + input.purchaseUrl,
    "📝 Review completo no Vetor.blog: " + input.reviewUrl,
    "",
    "Confira preço final, frete, disponibilidade e condições atuais no anúncio.",
    "Se o vídeo ajudou, deixe o like e inscreva-se no canal para mais análises!",
  ].join("\n");
}
