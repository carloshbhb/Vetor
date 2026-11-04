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
  const maxLineChars = Math.max(18, Math.min(52, Math.floor(Number(options.maxLineChars) || 36)));
  const requiredCaptionSeconds = (text) => {
    const lines = String(text || "").split(/\r?\n/);
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    return longestLine / 15 + Math.max(0, lines.length - 1) * 0.4 + 1;
  };

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
      const chunkWords = words.slice(index, next);
      chunks.push({
        words: chunkWords,
        text: wrapCaptionWords(chunkWords, maxLineChars),
      });
    }

    // The Edge TTS alignment can be rejected when its word events differ from
    // the normalized script. In that case, do not divide time only by word count:
    // reserve the same on-screen reading time the QA gate will require.
    while (chunks.length > 1) {
      const requiredTotal = chunks.reduce((sum, chunk) => sum + requiredCaptionSeconds(chunk.text), 0);
      if (requiredTotal <= duration + 0.02) break;
      const last = chunks.pop();
      const previous = chunks.pop();
      const mergedWords = [...previous.words, ...last.words];
      chunks.push({ words: mergedWords, text: wrapCaptionWords(mergedWords, maxLineChars) });
    }

    const required = chunks.map((chunk) => requiredCaptionSeconds(chunk.text));
    const requiredTotal = required.reduce((sum, value) => sum + value, 0);
    const spare = Math.max(0, duration - requiredTotal);
    const extraPerCue = chunks.length ? spare / chunks.length : 0;
    let cursor = start;

    return chunks.map((chunk, index) => {
      const cueStart = cursor;
      const cueEnd = index === chunks.length - 1
        ? end
        : Math.min(end, cueStart + required[index] + extraPerCue);
      cursor = cueEnd;
      return {
        start: cueStart,
        end: cueEnd,
        text: chunk.text,
        segmentKind,
      };
    });
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

/**
 * Split a script word or an Edge TTS boundary into the alphanumeric units that
 * are actually spoken. URLs, model codes and decimals are often emitted as
 * several WordBoundary events ("https", "www", "vetor", ...), so comparing one
 * whitespace-delimited script word against one boundary is too strict.
 */
function splitAlignmentUnits(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function buildAlignmentModel(segments, wordBoundaries) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const words = [];
  const expectedUnits = [];

  sourceSegments.forEach((segment, segmentIndex) => {
    const tokens = String(segment?.text || "").trim().split(/\s+/).filter(Boolean);
    for (const word of tokens) {
      const wordIndex = words.length;
      const units = splitAlignmentUnits(word);
      words.push({
        word,
        segmentIndex,
        kind: String(segment.kind || "scene"),
        unitStart: expectedUnits.length,
        unitCount: units.length,
      });
      for (const unit of units) expectedUnits.push({ text: unit, wordIndex });
    }
  });

  const actualUnits = [];
  const boundaries = Array.isArray(wordBoundaries) ? wordBoundaries : [];
  boundaries.forEach((item) => {
    if (!item || String(item.type || "WordBoundary") !== "WordBoundary") return;
    const offset = Number(item.offset);
    const duration = Number(item.duration);
    if (!Number.isFinite(offset) || !Number.isFinite(duration) || duration <= 0) return;
    const units = splitAlignmentUnits(item.text);
    if (!units.length) return;
    const weights = units.map((unit) => Math.max(1, unit.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = offset;
    units.forEach((unit, index) => {
      const span = (duration * weights[index]) / totalWeight;
      actualUnits.push({
        text: unit,
        start: cursor / 10_000_000,
        end: (cursor + span) / 10_000_000,
      });
      cursor += span;
    });
  });

  return { words, expectedUnits, actualUnits };
}

function longestCommonSubsequencePairs(left, right) {
  const n = left.length;
  const m = right.length;
  if (!n || !m) return [];
  // Word boundaries for a long video are in the low thousands. Keep the DP
  // bounded so a malformed audio track cannot exhaust the runner's memory.
  if ((n + 1) * (m + 1) > 4_000_000) return [];
  const width = m + 1;
  const dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i * width + j] = left[i] === right[j]
        ? dp[(i + 1) * width + j + 1] + 1
        : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return pairs;
}

function mapExpectedUnitIndices(expectedCount, actualCount, anchors) {
  const mapped = new Array(expectedCount).fill(0);
  if (!expectedCount || !actualCount) return mapped;
  if (!anchors.length) {
    for (let index = 0; index < expectedCount; index += 1) {
      mapped[index] = expectedCount === 1
        ? 0
        : Math.round((index * (actualCount - 1)) / (expectedCount - 1));
    }
    return mapped;
  }

  const first = anchors[0];
  for (let index = 0; index < first[0]; index += 1) {
    mapped[index] = Math.round((index * first[1]) / Math.max(1, first[0]));
  }
  for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
    const [expectedIndex, actualIndex] = anchors[anchorIndex];
    mapped[expectedIndex] = actualIndex;
    const next = anchors[anchorIndex + 1];
    if (!next || next[0] <= expectedIndex) continue;
    const expectedSpan = next[0] - expectedIndex;
    const actualSpan = next[1] - actualIndex;
    for (let index = expectedIndex + 1; index < next[0]; index += 1) {
      mapped[index] = Math.round(actualIndex + ((index - expectedIndex) * actualSpan) / expectedSpan);
    }
  }
  const last = anchors[anchors.length - 1];
  const remainingExpected = expectedCount - 1 - last[0];
  const remainingActual = actualCount - 1 - last[1];
  for (let index = last[0] + 1; index < expectedCount; index += 1) {
    mapped[index] = Math.round(last[1] + ((index - last[0]) * remainingActual) / Math.max(1, remainingExpected));
  }
  for (let index = 0; index < mapped.length; index += 1) {
    mapped[index] = Math.min(actualCount - 1, Math.max(index > 0 ? mapped[index - 1] : 0, mapped[index]));
  }
  return mapped;
}

function allocateUnitTimings(expectedUnits, actualUnits, mappedIndices) {
  const groups = new Map();
  expectedUnits.forEach((unit, index) => {
    const actualIndex = mappedIndices[index];
    if (!Number.isInteger(actualIndex) || actualIndex < 0 || actualIndex >= actualUnits.length) return;
    if (!groups.has(actualIndex)) groups.set(actualIndex, []);
    groups.get(actualIndex).push({ index, weight: Math.max(1, unit.text.length) });
  });

  const timings = new Array(expectedUnits.length).fill(null);
  for (const [actualIndex, items] of groups) {
    const actual = actualUnits[actualIndex];
    if (!Number.isFinite(actual.start) || !Number.isFinite(actual.end) || actual.end <= actual.start) continue;
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = actual.start;
    for (const item of items.sort((left, right) => left.index - right.index)) {
      const span = ((actual.end - actual.start) * item.weight) / totalWeight;
      timings[item.index] = { start: cursor, end: cursor + span };
      cursor += span;
    }
  }
  return timings;
}

function fillMissingWordTimings(wordTimings, words) {
  let lastEnd = 0;
  for (let index = 0; index < wordTimings.length; index += 1) {
    const timing = wordTimings[index];
    if (!timing || !Number.isFinite(timing.start) || !Number.isFinite(timing.end) || timing.end <= timing.start) {
      wordTimings[index] = null;
      continue;
    }
    timing.start = Math.max(timing.start, lastEnd);
    timing.end = Math.max(timing.end, timing.start + 0.01);
    lastEnd = timing.end;
  }

  let index = 0;
  while (index < wordTimings.length) {
    if (wordTimings[index]) {
      index += 1;
      continue;
    }
    let endIndex = index;
    while (endIndex < wordTimings.length && !wordTimings[endIndex]) endIndex += 1;
    const previous = index > 0 ? wordTimings[index - 1] : null;
    const next = endIndex < wordTimings.length ? wordTimings[endIndex] : null;
    const count = endIndex - index;
    const weights = [];
    let totalWeight = 0;
    for (let position = index; position < endIndex; position += 1) {
      const weight = Math.max(1, String(words[position]?.word || "").length);
      weights.push(weight);
      totalWeight += weight;
    }
    const start = previous ? previous.end : next ? Math.max(0, next.start - count * 0.2) : 0;
    const end = next ? next.start : start + count * 0.2;
    let cursor = start;
    for (let position = index; position < endIndex; position += 1) {
      const span = ((Math.max(start + 0.01 * count, end) - start) * weights[position - index]) / totalWeight;
      wordTimings[position] = { start: cursor, end: cursor + span };
      cursor += span;
    }
    index = endIndex;
  }

  lastEnd = 0;
  for (const timing of wordTimings) {
    if (!timing) continue;
    timing.start = Math.max(timing.start, lastEnd);
    timing.end = Math.max(timing.end, timing.start + 0.01);
    lastEnd = timing.end;
  }
}

/**
 * Align Edge TTS boundaries with script words.
 *
 * Boundary text is split into alphanumeric units, which keeps URLs and model
 * codes aligned even when Edge emits one event per URL component. With
 * `allowApproximate`, a longest-common-subsequence anchor pass keeps captions
 * usable when the TTS engine also expands numbers or drops a token.
 */
function alignWordBoundaries(segments, wordBoundaries, options = {}) {
  const model = buildAlignmentModel(segments, wordBoundaries);
  const { words, expectedUnits, actualUnits } = model;
  if (!words.length || !expectedUnits.length || !actualUnits.length) return null;

  let mappedIndices;
  let exact = expectedUnits.length === actualUnits.length;
  if (exact) {
    for (let index = 0; index < expectedUnits.length; index += 1) {
      if (expectedUnits[index].text !== actualUnits[index].text) {
        exact = false;
        break;
      }
    }
  }

  if (exact) {
    mappedIndices = expectedUnits.map((_, index) => index);
  } else {
    if (options.allowApproximate !== true) return null;
    const anchors = longestCommonSubsequencePairs(
      expectedUnits.map((unit) => unit.text),
      actualUnits.map((unit) => unit.text)
    );
    mappedIndices = mapExpectedUnitIndices(expectedUnits.length, actualUnits.length, anchors);
  }

  const unitTimings = allocateUnitTimings(expectedUnits, actualUnits, mappedIndices);
  const wordTimings = words.map((word) => {
    if (!word.unitCount) return null;
    const first = unitTimings[word.unitStart];
    const last = unitTimings[word.unitStart + word.unitCount - 1];
    if (!first || !last || last.end <= first.start) return null;
    return { start: first.start, end: last.end };
  });
  fillMissingWordTimings(wordTimings, words);
  if (wordTimings.some((timing) => !timing)) return null;

  return {
    expected: words.map(({ word, segmentIndex, kind }) => ({ word, segmentIndex, kind })),
    boundaries: wordTimings.map((timing, index) => ({
      offset: Math.round(timing.start * 10_000_000),
      duration: Math.max(1, Math.round((timing.end - timing.start) * 10_000_000)),
      text: words[index].word,
    })),
    exact,
  };
}

export function stripSpokenUrls(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/https?:\/\/[^\s]+/gi, "no link da descrição")
    .replace(/\bwww\.[^\s]+/gi, "no link da descrição")
    .replace(/\b[a-z0-9-]+\.(?:com|com\.br|blog|net|io|app|br)(?:\/[^\s]*)?/gi, "no link da descrição")
    .replace(/\b(?:em|no|na|pelo|pela)\s+no link da descrição/gi, "no link da descrição")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}

/**
 * Exact per-segment timing (seconds) from Edge TTS word boundaries.
 *
 * Each segment starts when its first word is spoken. A segment ends when the next
 * segment starts, so the pause between paragraphs belongs to the scene that just
 * finished and scenes tile the timeline with no gaps. The first segment starts at 0
 * and the last one ends at totalDuration. Segments without words get a zero-length
 * span. Returns null when the boundaries do not align with the script, so the caller
 * can fall back to the proportional estimate.
 */
export function buildNarrationTimings(segments, wordBoundaries, totalDuration, options = {}) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const aligned = alignWordBoundaries(sourceSegments, wordBoundaries, options);
  const total = Number(totalDuration);
  if (!aligned || !Number.isFinite(total) || total <= 0) return null;

  const firstWordStart = new Map();
  aligned.expected.forEach((item, index) => {
    if (!firstWordStart.has(item.segmentIndex)) {
      firstWordStart.set(item.segmentIndex, aligned.boundaries[index].offset / 10_000_000);
    }
  });

  // Backward pass: a segment with no words starts where the next one starts (zero length).
  const starts = new Array(sourceSegments.length).fill(total);
  let nextStart = total;
  for (let index = sourceSegments.length - 1; index >= 1; index -= 1) {
    const spoken = firstWordStart.get(index);
    starts[index] = Math.min(total, spoken ?? nextStart);
    nextStart = starts[index];
  }
  if (sourceSegments.length) starts[0] = 0;
  for (let index = 1; index < starts.length; index += 1) {
    starts[index] = Math.max(starts[index - 1], starts[index]);
  }
  return sourceSegments.map((segment, index) => {
    const start = starts[index];
    const end = index === sourceSegments.length - 1 ? total : starts[index + 1];
    return { ...segment, start, end: Math.max(start, end), duration: Math.max(0, end - start) };
  });
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
  const aligned = alignWordBoundaries(sourceSegments, wordBoundaries, options);
  if (!aligned) return null;
  const { expected, boundaries } = aligned;

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
      // Per-word timings let the renderer highlight the word actually being spoken.
      const cueWords = [];
      for (let position = wordIndex; position < next; position += 1) {
        const boundary = boundaries[cursor + position];
        cueWords.push({
          text: words[position],
          start: boundary.offset / 10_000_000,
          end: (boundary.offset + boundary.duration) / 10_000_000,
        });
      }
      result.push({
        start,
        end,
        text: wrapCaptionWords(words.slice(wordIndex, next), maxLineChars),
        segmentKind,
        words: cueWords,
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
    : 12;
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
      previous.words = [...(previous.words || []), ...(cue.words || [])];
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
      next.words = [...(cue.words || []), ...(next.words || [])];
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
