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
  if (input.format === "short") {
    return [
      String(input.hook || "").trim(),
      "",
      "A análise completa e as ofertas atualizadas estão no link do perfil do Quick Review Brasil.",
      "Qual ponto pesa mais na sua decisão? Conte nos comentários.",
      "",
      "#Shorts #Tecnologia #Review #VetorBlog",
    ].filter(Boolean).join("\n").slice(0, 5000);
  }

  const chapters = (input.chapters || [])
    .filter((chapter) => Number.isFinite(chapter.time) && chapter.time >= 0 && String(chapter.title || "").trim())
    .sort((a, b) => a.time - b.time)
    .filter((chapter, index, list) => index === 0 || chapter.time - list[index - 1].time >= 10)
    .map((chapter) => formatYouTubeTimestamp(chapter.time) + " " + String(chapter.title).replace(/[\r\n]+/g, " ").slice(0, 70));
  if (chapters.length && !chapters[0].startsWith("0:00 ")) chapters.unshift("0:00 Introdução e decisão de compra");

  return [
    "🛒 PREÇO E LINK DE COMPRA: " + input.purchaseUrl,
    "📝 REVIEW COMPLETO NO VETOR.BLOG: " + input.reviewUrl,
    "",
    "Vale a pena comprar " + input.productTitle + "? Nesta análise, organizamos recursos documentados, limitações e critérios para decidir se o produto combina com seu uso.",
    "",
    "CAPÍTULOS",
    ...chapters,
    "",
    String(input.callToAction || "Confira o review completo e as condições atuais no anúncio.").trim(),
    "",
    "Confira preço final, frete, disponibilidade, compatibilidade, garantia e condições diretamente no anúncio. Links podem ser afiliados; isso não altera os critérios editoriais.",
    "",
    "#Review #Tecnologia #CustoBeneficio #VetorBlog",
  ].filter(Boolean).join("\n").slice(0, 5000);
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
