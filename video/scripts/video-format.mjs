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

export function buildCaptionEntries(segments, maxWords = 7, options = {}) {
  const limit = Math.min(10, Math.max(3, Math.floor(Number(maxWords) || 7)));
  return (Array.isArray(segments) ? segments : []).flatMap((segment) => {
    const words = String(segment?.text || "").trim().split(/\s+/).filter(Boolean);
    const start = Number(segment?.start);
    const end = Number(segment?.end);
    if (!words.length || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    const duration = end - start;
    const segmentKind = String(segment?.kind || "scene");
    const chunks = [];
    for (let index = 0; index < words.length; index += limit) {
      const next = Math.min(words.length, index + limit);
      chunks.push({
        start: start + duration * index / words.length,
        end: start + duration * next / words.length,
        text: wrapCaptionWords(words.slice(index, next), Math.max(18, Math.min(52, Math.floor(Number(options.maxLineChars) || 36)))),
        segmentKind,
      });
    }
    return chunks;
  });
}

function wrapCaptionWords(words, maxLineChars) {
  const lines = [];
  let current = "";
  for (const rawWord of Array.isArray(words) ? words : []) {
    const word = String(rawWord || "").trim();
    if (!word) continue;
    const candidate = current ? current + " " + word : word;
    if (current && candidate.length > maxLineChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
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
  // Edge TTS word boundaries can leave short tail cues or split a phrase around a natural pause.
  // Merge adjacent same-track cues until each beat has enough on-screen time to be read.
  // remotion-qa uses: longest line / 15 chars per second + 0.4s per extra line + 1s.
  const maxMergeGap = Number.isFinite(Number(options.maxMergeGap))
    ? Math.max(0, Number(options.maxMergeGap))
    : 0.9;
  const maxMergeSpan = Number.isFinite(Number(options.maxMergeSpan))
    ? Math.max(2, Number(options.maxMergeSpan))
    : 7;
  const requiredCaptionSeconds = (text) => {
    const lines = String(text || "").split(/\r?\n/);
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    return longestLine / 15 + Math.max(0, lines.length - 1) * 0.4 + 1;
  };
  const readable = result.map((cue) => ({ ...cue }));
  let cueIndex = 0;
  while (cueIndex < readable.length) {
    const cue = readable[cueIndex];
    const duration = cue.end - cue.start;
    if (duration + 0.02 >= requiredCaptionSeconds(cue.text)) {
      cueIndex += 1;
      continue;
    }

    const previous = readable[cueIndex - 1];
    const next = readable[cueIndex + 1];
    const previousGap = previous ? cue.start - previous.end : Infinity;
    const nextGap = next ? next.start - cue.end : Infinity;
    const canMergePrevious = Boolean(
      previous &&
      cue.segmentKind === previous.segmentKind &&
      previousGap <= maxMergeGap &&
      cue.end - previous.start <= maxMergeSpan
    );
    const canMergeNext = Boolean(
      next &&
      cue.segmentKind === next.segmentKind &&
      nextGap <= maxMergeGap &&
      next.end - cue.start <= maxMergeSpan
    );

    if (canMergePrevious) {
      previous.end = Math.max(previous.end, cue.end);
      previous.text = wrapCaptionWords(
        (previous.text + " " + cue.text).replace(/\s+/g, " ").trim().split(" "),
        maxLineChars
      );
      readable.splice(cueIndex, 1);
      cueIndex = Math.max(0, cueIndex - 1);
      continue;
    }
    if (canMergeNext) {
      next.start = Math.min(next.start, cue.start);
      next.text = wrapCaptionWords(
        (cue.text + " " + next.text).replace(/\s+/g, " ").trim().split(" "),
        maxLineChars
      );
      readable.splice(cueIndex, 1);
      continue;
    }
    cueIndex += 1;
  }

  return readable.length ? readable : null;
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
      "A análise completa e as ofertas estão no link do perfil do canal Vetor.",
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
