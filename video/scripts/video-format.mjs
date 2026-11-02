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

function wrapCaptionWords(words, maxLineChars = 36) {
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (line && candidate.length > maxLineChars) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export function buildCaptionEntries(segments, maxWords = 7) {
  const limit = Math.min(100, Math.max(3, Math.floor(Number(maxWords) || 7)));
  return (Array.isArray(segments) ? segments : []).flatMap((segment) => {
    const words = String(segment?.text || "").trim().split(/\s+/).filter(Boolean);
    const start = Number(segment?.start);
    const end = Number(segment?.end);
    if (!words.length || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

    const chunkCount = Math.ceil(words.length / limit);
    const baseSize = Math.floor(words.length / chunkCount);
    const remainder = words.length % chunkCount;
    const chunks = [];
    let cursor = 0;
    for (let index = 0; index < chunkCount; index += 1) {
      const size = baseSize + (index < remainder ? 1 : 0);
      const chunkWords = words.slice(cursor, cursor + size);
      const from = cursor;
      cursor += size;
      chunks.push({
        start: start + (end - start) * from / words.length,
        end: start + (end - start) * cursor / words.length,
        text: wrapCaptionWords(chunkWords),
        segmentKind: String(segment.kind || "scene"),
      });
    }
    return chunks;
  });
}

function normalizeBoundaryToken(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Convert Edge TTS word boundaries (100ns ticks) to caption cues.
 * Return null if the returned words do not align one-to-one with the script;
 * the caller then uses the deterministic word-count timing fallback.
 */
export function buildTimedCaptionEntries(segments, wordBoundaries, options = {}) {
  const maxWords = Math.max(2, Math.min(12, Math.floor(Number(options.maxWords) || 5)));
  const maxLineChars = Math.max(18, Math.min(52, Math.floor(Number(options.maxLineChars) || 36)));
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const boundaries = (Array.isArray(wordBoundaries) ? wordBoundaries : [])
    .filter((item) => item && String(item.type || "WordBoundary") === "WordBoundary")
    .map((item) => ({
      offset: Number(item.offset),
      duration: Number(item.duration),
      text: String(item.text || ""),
    }));

  const expected = sourceSegments.flatMap((segment, segmentIndex) =>
    String(segment?.text || "").trim().split(/\s+/).filter(Boolean).map((word) => ({
      word,
      segmentIndex,
      kind: String(segment.kind || "scene"),
    }))
  );
  if (!expected.length || boundaries.length !== expected.length) return null;

  for (let index = 0; index < expected.length; index += 1) {
    const actualToken = normalizeBoundaryToken(boundaries[index].text);
    const expectedToken = normalizeBoundaryToken(expected[index].word);
    if (!actualToken || !expectedToken || actualToken !== expectedToken) return null;
    if (!Number.isFinite(boundaries[index].offset) || !Number.isFinite(boundaries[index].duration) || boundaries[index].duration <= 0) {
      return null;
    }
    if (index > 0 && boundaries[index].offset < boundaries[index - 1].offset) return null;
  }

  const result = [];
  let cursor = 0;
  for (let segmentIndex = 0; segmentIndex < sourceSegments.length; segmentIndex += 1) {
    const words = expected.filter((item) => item.segmentIndex === segmentIndex).map((item) => item.word);
    if (!words.length) continue;
    const segmentKind = String(sourceSegments[segmentIndex].kind || "scene");
    for (let wordIndex = 0; wordIndex < words.length; wordIndex += maxWords) {
      const next = Math.min(words.length, wordIndex + maxWords);
      const firstBoundary = boundaries[cursor + wordIndex];
      const lastBoundary = boundaries[cursor + next - 1];
      const start = firstBoundary.offset / 10_000_000;
      const end = (lastBoundary.offset + lastBoundary.duration) / 10_000_000;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      result.push({
        start,
        end,
        text: wrapCaptionWords(words.slice(wordIndex, next), maxLineChars),
        segmentKind,
      });
    }
    cursor += words.length;
  }
  return result.length ? result : null;
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
      "Em Shorts, links externos na descrição podem não ser clicáveis. Se o endereço não abrir ao tocar, copie o link ou acesse os links disponíveis no perfil do canal.",
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
