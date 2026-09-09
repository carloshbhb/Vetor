// Converte VideoScript (formato existente do Mini Saas) → video-data.json (formato Remotion)
// Usado pelo remotion-worker.mjs antes de renderizar.

/**
 * @param {object} script - VideoScript do lib/video-script.ts
 * @param {object} review - ReviewData (para imageUrl, affiliateUrl, etc)
 * @param {string} siteUrl - URL base do site
 * @returns {object} video-data.json no formato Remotion
 */
export function convertVideoScriptToRemotionData(script, review, siteUrl) {
  const FPS = 30;
  const TOTAL_DURATION = script.estimatedSeconds || 50;

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

  const segments = psScenes.map((scene, i) => ({
    id: i === 0 ? "problem" : "solution",
    startFrame: hookFrames + i * segmentDuration,
    endFrame: hookFrames + (i + 1) * segmentDuration,
    narration: scene.narration || "",
    visual: {
      layout: i === 0 ? "split_screen" : "showcase",
      ...(i === 0
        ? {
            left: {
              type: "image",
              source: "local",
              query: review.product,
              filter: "desaturate",
            },
            right: {
              type: "mockup_ui",
              screen: "productivity_chart",
              data: {
                label: "Produtividade",
                value: 23,
                unit: "%",
                trend: "down",
                color: "#FF4757",
              },
            },
          }
        : {
            product: {
              type: "mockup_device",
              device: "product",
              rotation: true,
              rotationSpeed: 0.5,
            },
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
  }));

  // Se não tem cenas suficientes, cria um segmento único
  if (segments.length === 0) {
    segments.push({
      id: "problem",
      startFrame: hookFrames,
      endFrame: hookFrames + psFrames,
      narration: script.fullNarration || "",
      visual: {
        layout: "showcase",
        product: {
          type: "mockup_device",
          device: "product",
          rotation: true,
          rotationSpeed: 0.5,
        },
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

  return {
    meta: {
      title: script.title,
      duration: TOTAL_DURATION,
      fps: FPS,
      resolution: { width: 1080, height: 1920 },
      voiceId: "pt-BR-AntonioNeural",
      language: "pt-BR",
      palette: {
        primary: "#6C5CE7",
        secondary: "#00CEC9",
        accent: "#FD79A8",
        dark: "#0A0A0F",
        surface: "#1A1A2E",
        text: "#FFFFFF",
      },
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
