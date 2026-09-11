// Converte VideoScript (formato existente do Mini Saas) → video-data.json (formato Remotion)
// Usado pelo remotion-worker.mjs antes de renderizar.

/**
 * Filtra URLs de imagem quebradas (Unsplash retorna 404).
 * Mantém apenas URLs de domínios confiáveis (ML, Supabase, etc).
 */
function filterValidImages(urls, fallback) {
  const valid = (urls || []).filter(url => {
    if (!url || typeof url !== 'string') return false;
    // Remove URLs quebradas do Unsplash (retornam 404)
    if (url.includes('unsplash.com')) return false;
    // Remove URLs vazias
    if (url.trim() === '') return false;
    return true;
  });
  // Se não tem nenhuma imagem válida, usa o fallback
  if (valid.length === 0 && fallback) return [fallback];
  return valid;
}

/**
 * Generate timedWords from narration for frame-accurate caption sync.
 * @param {string} narration - Text to split into timed words
 * @param {number} durationSec - Duration of the scene in seconds
 * @param {number} fps - Frames per second (default: 30)
 * @returns {Array<{text: string, startMs: number, endMs: number}>}
 */
function generateTimedWords(narration, durationSec, fps = 30) {
  const words = narration.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  const totalMs = durationSec * 1000;
  const msPerWord = totalMs / words.length;

  return words.map((word, i) => ({
    text: word,
    startMs: Math.round(i * msPerWord),
    endMs: Math.round((i + 1) * msPerWord),
  }));
}

/**
 * Generate timedWords for all sections combined.
 * @param {Array} sections - Array of sections with narration and duration
 * @param {number} fps - Frames per second (default: 30)
 * @returns {Array<{text: string, startMs: number, endMs: number}>}
 */
function generateAllTimedWords(sections, fps = 30) {
  const allTimedWords = [];
  let currentTimeMs = 0;

  for (const section of sections) {
    const sectionTimedWords = generateTimedWords(section.narration || '', section.duration || 8, fps);
    const offsetTimedWords = sectionTimedWords.map(tw => ({
      ...tw,
      startMs: tw.startMs + currentTimeMs,
      endMs: tw.endMs + currentTimeMs,
    }));
    allTimedWords.push(...offsetTimedWords);
    currentTimeMs += (section.duration || 8) * 1000;
  }

  return allTimedWords;
}

/**
 * @param {object} script - VideoScript do lib/video-script.ts
 * @param {object} review - ReviewData (para imageUrl, affiliateUrl, etc)
 * @param {string} siteUrl - URL base do site
 * @returns {object} video-data.json no formato Remotion
 */
export function convertVideoScriptToRemotionData(script, review, siteUrl) {
  const FPS = 30;
  const TOTAL_DURATION = script.estimatedSeconds || 50;

  // Imagem principal do produto (fallback: review.imageUrl)
  // Prioriza imageUrl real do ML (review.imageUrl) sobre imagens geradas pela IA
  const productImage = review.imageUrl || "";

  // Divide as cenas em 3 seções: hook (3s), problem_solution (restante - 20s), cta (20s)
  const hookDuration = 3;
  const ctaDuration = Math.min(20, Math.floor(TOTAL_DURATION * 0.4));
  const psDuration = TOTAL_DURATION - hookDuration - ctaDuration;

  const hookFrames = hookDuration * FPS;
  const psFrames = psDuration * FPS;
  const ctaFrames = ctaDuration * FPS;

  // Mapeia cenas do VideoScript para segments do problem_solution
  const scenes = script.scenes || [];
  // scenes[0] = hook (já separado), scenes[1..n-1] = problem_solution, scenes[n] = cta
  const psScenes = scenes.slice(1, -1);
  const ctaScene = scenes[scenes.length - 1];

  // Divide o problem_solution em segments
  const segmentDuration = psScenes.length > 0
    ? Math.floor(psFrames / psScenes.length)
    : psFrames;

  const segments = psScenes.map((scene, i) => {
    // Sempre inclui a imagem real do review como primeira opção
    // Filtra URLs quebradas (Unsplash retorna 404)
    const sceneImages = filterValidImages(
      [productImage, ...(scene.images || [])],
      productImage
    ).slice(0, 3);

    return {
      id: i === 0 ? "problem" : "solution",
      startFrame: hookFrames + i * segmentDuration,
      endFrame: hookFrames + (i + 1) * segmentDuration,
      narration: scene.narration || "",
      onScreenText: scene.onScreenText || "",
      visual: {
        layout: i === 0 ? "split_screen" : "showcase",
        ...(i === 0
          ? {
              left: {
                type: "image",
                imageUrl: sceneImages[0] || productImage,
                filter: "desaturate",
              },
              right: {
                type: "image",
                imageUrl: sceneImages[1] || sceneImages[0] || productImage,
                filter: "none",
              },
            }
          : {
              product: {
                type: "image",
                imageUrl: sceneImages[0] || productImage,
                rotation: true,
                rotationSpeed: 0.3,
              },
              gallery: sceneImages,
              infographics: [
                {
                  type: "radial_progress",
                  data: {
                    label: "Nota",
                    value: (review.hero?.overallScore || review.verdict?.score || 8) * 10,
                    color: "#6C5CE7",
                  },
                  animated: true,
                },
              ],
            }),
        captions: {
          style: "kinetic",
          position: "bottom",
          fontSize: i === 0 ? 48 : 44,
          wordByWord: true,
        },
      },
    };
  });

  // Se não tem cenas suficientes, cria um segmento único
  if (segments.length === 0) {
    segments.push({
      id: "problem",
      startFrame: hookFrames,
      endFrame: hookFrames + psFrames,
      narration: script.fullNarration || "",
      onScreenText: "",
      visual: {
        layout: "showcase",
        product: {
          type: "image",
          imageUrl: productImage,
          rotation: true,
          rotationSpeed: 0.3,
        },
        gallery: [productImage].filter(Boolean),
        infographics: [
          {
            type: "radial_progress",
            data: {
              label: "Nota",
              value: (review.hero?.overallScore || review.verdict?.score || 8) * 10,
              color: "#6C5CE7",
            },
            animated: true,
          },
        ],
        captions: {
          style: "kinetic",
          position: "bottom",
          fontSize: 44,
          wordByWord: true,
        },
      },
    });
  }

  // Estrelas do SocialProof (1-5 baseado na nota)
  const score = review.hero?.overallScore || review.verdict?.score || 8;
  const stars = Math.min(5, Math.max(1, Math.round(score / 2)));

  // Review count fake (baseado em dados reais se disponíveis)
  const reviewCount = review.testimonials?.length
    ? review.testimonials.length * 120 + 500
    : 2847;

  // Contador de urgência (inventado, mas realista)
  const urgencyStart = 50;

  const reviewUrl = `${siteUrl}/review/${review.slug}`;
  const affiliateUrl = review.affiliateUrl || reviewUrl;

  // Imagens do hook (primeira cena ou fallback para productImage)
  const hookScene = scenes[0] || {};
  const hookImages = filterValidImages(
    [productImage, ...(hookScene.images || [])],
    productImage
  ).slice(0, 3);

  // Imagens do CTA (última cena)
  const ctaImages = filterValidImages(
    [productImage, ...(ctaScene?.images || [])],
    productImage
  ).slice(0, 3);

  // Generate timedWords for frame-accurate caption synchronization
  const allSections = [
    { narration: scenes[0]?.narration || script.hook || '', duration: hookDuration },
    ...psScenes.map(s => ({ narration: s.narration || '', duration: psDuration / psScenes.length })),
    { narration: ctaScene?.narration || script.finalCta || script.cta || '', duration: ctaDuration },
  ];
  const timedWords = generateAllTimedWords(allSections, FPS);

  return {
    meta: {
      title: script.title,
      duration: TOTAL_DURATION,
      fps: FPS,
      resolution: { width: 1080, height: 1920 },
      voiceId: "pt-BR-AntonioNeural",
      language: "pt-BR",
      productImage,
      productName: review.product || "",
      palette: {
        primary: "#6C5CE7",
        secondary: "#00CEC9",
        accent: "#FD79A8",
        dark: "#0A0A0F",
        surface: "#1A1A2E",
        text: "#FFFFFF",
      },
      timedWords,
    },
    audio: {
      tts: {
        provider: "edge-tts",
        voice: "pt-BR-AntonioNeural",
        rate: "+10%",
        pitch: "+0Hz",
      },
    },
    sections: [
      // HOOK (0-3s)
      {
        id: "hook",
        startFrame: 0,
        endFrame: hookFrames,
        duration: hookDuration,
        type: "hook",
        narration: scenes[0]?.narration || script.hook || "",
        visual: {
          backgroundImage: hookImages[0] || productImage,
          background: {
            type: "gradient",
            colors: ["#6C5CE7", "#0A0A0F"],
            angle: 135,
            animated: true,
            animationType: "pulse",
          },
          captions: {
            style: "kinetic",
            effect: "scale_spring",
            fontSize: 72,
            fontWeight: 900,
            color: "#FFFFFF",
            position: "center",
            wordByWord: true,
            highlightColor: "#FD79A8",
          },
          particles: {
            enabled: true,
            count: 30,
            type: "dots",
            color: "#6C5CE7",
            speed: 2,
          },
        },
      },
      // PROBLEM_SOLUTION (3s até TOTAL-20s)
      {
        id: "problem_solution",
        startFrame: hookFrames,
        endFrame: hookFrames + psFrames,
        duration: psDuration,
        type: "problem_solution",
        segments,
      },
      // CTA (últimos 20s)
      {
        id: "cta",
        startFrame: hookFrames + psFrames,
        endFrame: hookFrames + psFrames + ctaFrames,
        duration: ctaDuration,
        type: "cta",
        narration: ctaScene?.narration || script.finalCta || script.cta || "Link da oferta na descrição",
        visual: {
          backgroundImage: ctaImages[0] || productImage,
          background: {
            type: "gradient",
            colors: ["#0A0A0F", "#1A1A2E"],
            angle: 180,
          },
          qr_code: {
            enabled: true,
            url: affiliateUrl,
            size: 280,
            errorCorrection: "H",
            animation: {
              type: "spring_bounce",
              delay: 15,
            },
          },
          urgency: {
            enabled: true,
            text: script.priceHighlight || "OFERTA",
            countdown: true,
            startValue: urgencyStart,
            color: "#FD79A8",
            fontSize: 56,
            animation: "pulse",
          },
          buy_button: {
            text: script.offerBadge || "COMPRAR AGORA",
            url: affiliateUrl,
            color: "#6C5CE7",
            textColor: "#FFFFFF",
            fontSize: 36,
            borderRadius: 50,
            animation: {
              type: "spring_bounce",
              stiffness: 200,
              damping: 10,
            },
          },
          captions: {
            style: "kinetic",
            position: "top",
            fontSize: 42,
            highlightColor: "#FD79A8",
          },
          social_proof: {
            stars,
            reviewCount,
            avatars: {
              count: 5,
              style: "stacked",
            },
          },
        },
      },
    ],
  };
}

// ── Long-Form Converter ─────────────────────────────────────────────
// Gera video-data.json para vídeos horizontais longos (10-20 min)
export function convertVideoScriptToLongFormData(script, review, siteUrl) {
  const FPS = 30;

  // Long-form: 2 minutos = 120 segundos
  const TOTAL_DURATION = Math.max(script.estimatedSeconds || 50, 120);

  const productImage = review.imageUrl || "";

  // Seções: hook (10s), problem_solution (extended), cta (2min)
  const hookDuration = 10;
  const ctaDuration = 30;
  const psDuration = TOTAL_DURATION - hookDuration - ctaDuration;

  const hookFrames = hookDuration * FPS;
  const psFrames = psDuration * FPS;
  const ctaFrames = ctaDuration * FPS;

  const scenes = script.scenes || [];
  const psScenes = scenes.slice(1, -1);
  const ctaScene = scenes[scenes.length - 1];

  // Para long-form, duplicar e estender os segments
  const segmentDuration = psScenes.length > 0
    ? Math.floor(psFrames / psScenes.length)
    : psFrames;

  const segments = psScenes.map((scene, i) => {
    const sceneImages = filterValidImages(
      [productImage, ...(scene.images || [])],
      productImage
    ).slice(0, 3);

    return {
      id: i === 0 ? "problem" : "solution",
      startFrame: hookFrames + i * segmentDuration,
      endFrame: hookFrames + (i + 1) * segmentDuration,
      narration: scene.narration || "",
      onScreenText: scene.onScreenText || "",
      visual: {
        layout: i === 0 ? "split_screen" : "showcase",
        ...(i === 0
          ? {
              left: { type: "image", imageUrl: sceneImages[0] || productImage, filter: "desaturate" },
              right: { type: "image", imageUrl: sceneImages[1] || sceneImages[0] || productImage, filter: "none" },
            }
          : {
              product: { type: "image", imageUrl: sceneImages[0] || productImage, rotation: true, rotationSpeed: 0.3 },
              gallery: sceneImages,
              infographics: [{ type: "radial_progress", data: { label: "Nota", value: (review.hero?.overallScore || review.verdict?.score || 8) * 10, color: "#6C5CE7" }, animated: true }],
            }),
        captions: { style: "kinetic", position: "bottom", fontSize: i === 0 ? 48 : 44, wordByWord: true },
      },
    };
  });

  const score = review.hero?.overallScore || review.verdict?.score || 8;
  const stars = Math.min(5, Math.max(1, Math.round(score / 2)));
  const reviewCount = review.testimonials?.length ? review.testimonials.length * 120 + 500 : 2847;
  const urgencyStart = 50;
  const reviewUrl = `${siteUrl}/review/${review.slug}`;
  const affiliateUrl = review.affiliateUrl || reviewUrl;

  const hookScene = scenes[0] || {};
  const hookImages = filterValidImages([productImage, ...(hookScene.images || [])], productImage).slice(0, 3);
  const ctaImages = filterValidImages([productImage, ...(ctaScene?.images || [])], productImage).slice(0, 3);

  return {
    meta: {
      title: script.title,
      duration: TOTAL_DURATION,
      fps: FPS,
      format: "horizontal",
      resolution: { width: 1920, height: 1080 },
      voiceId: "pt-BR-AntonioNeural",
      language: "pt-BR",
      productImage,
      productName: review.product || "",
      palette: { primary: "#6C5CE7", secondary: "#00CEC9", accent: "#FD79A8", dark: "#0A0A0F", surface: "#1A1A2E", text: "#FFFFFF" },
    },
    audio: { tts: { provider: "edge-tts", voice: "pt-BR-AntonioNeural", rate: "+10%", pitch: "+0Hz" } },
    sections: [
      { id: "hook", startFrame: 0, endFrame: hookFrames, duration: hookDuration, type: "hook", narration: scenes[0]?.narration || script.hook || "", visual: { backgroundImage: hookImages[0] || productImage, background: { type: "gradient", colors: ["#6C5CE7", "#0A0A0F"], angle: 135, animated: true, animationType: "pulse" }, captions: { style: "kinetic", effect: "scale_spring", fontSize: 96, fontWeight: 900, color: "#FFFFFF", position: "center", wordByWord: true, highlightColor: "#FD79A8" }, particles: { enabled: true, count: 30, type: "dots", color: "#6C5CE7", speed: 2 } } },
      { id: "problem_solution", startFrame: hookFrames, endFrame: hookFrames + psFrames, duration: psDuration, type: "problem_solution", segments },
      { id: "cta", startFrame: hookFrames + psFrames, endFrame: hookFrames + psFrames + ctaFrames, duration: ctaDuration, type: "cta", narration: ctaScene?.narration || script.finalCta || script.cta || "Link da oferta na descrição", visual: { backgroundImage: ctaImages[0] || productImage, background: { type: "gradient", colors: ["#0A0A0F", "#1A1A2E"], angle: 180 }, qr_code: { enabled: true, url: affiliateUrl, size: 400, errorCorrection: "H", animation: { type: "spring_bounce", delay: 15 } }, urgency: { enabled: true, text: script.priceHighlight || "OFERTA", countdown: true, startValue: urgencyStart, color: "#FD79A8", fontSize: 72, animation: "pulse" }, buy_button: { text: script.offerBadge || "COMPRAR AGORA", url: affiliateUrl, color: "#6C5CE7", textColor: "#FFFFFF", fontSize: 48, borderRadius: 50, animation: { type: "spring_bounce", stiffness: 200, damping: 10 } }, captions: { style: "kinetic", position: "top", fontSize: 60, highlightColor: "#FD79A8" }, social_proof: { stars, reviewCount, avatars: { count: 5, style: "stacked" } } } },
    ],
  };
}
