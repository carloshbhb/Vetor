import { normalizeVetorTemplateId, VETOR_VISUAL_TEMPLATES } from "./visual-template-registry.mjs";

const DIRECTING = Object.freeze({
  "price-check": {
    primary: "data-storytelling",
    support: ["kinetic-typography", "editorial-luxury"],
    transition: "data-wipe",
    energy: "high",
  },
  "tradeoff": {
    primary: "kinetic-typography",
    support: ["cinematic-2d", "data-storytelling"],
    transition: "word-swipe",
    energy: "high",
  },
  "comparison": {
    primary: "comparison-arena",
    support: ["data-storytelling", "kinetic-typography"],
    transition: "arena-slam",
    energy: "high",
  },
  "specification": {
    primary: "hologram-hud",
    support: ["data-storytelling", "premium-product-3d"],
    transition: "scan-reveal",
    energy: "medium",
  },
  "teardown": {
    primary: "exploded-teardown",
    support: ["premium-product-3d", "hologram-hud"],
    transition: "component-snap",
    energy: "medium",
  },
  "detail": {
    primary: "premium-product-3d",
    support: ["editorial-luxury", "hologram-hud"],
    transition: "cinematic-wipe",
    energy: "medium",
  },
  "lifestyle": {
    primary: "lifestyle-demo",
    support: ["cinematic-2d", "isometric-explainer"],
    transition: "match-cut",
    energy: "medium",
  },
  "verdict": {
    primary: "editorial-luxury",
    support: ["premium-product-3d", "kinetic-typography"],
    transition: "soft-cut",
    energy: "high",
  },
  "hook": {
    primary: "kinetic-typography",
    support: ["premium-product-3d", "cinematic-2d"],
    transition: "cinematic-wipe",
    energy: "high",
  },
  "feature": {
    primary: "cinematic-2d",
    support: ["premium-product-3d", "kinetic-typography"],
    transition: "layered-wipe",
    energy: "medium",
  },
});

const LAYERS = Object.freeze({
  "premium-product-3d": ["three-orbit", "product-hero", "macro-camera", "light-sweep"],
  "exploded-teardown": ["three-exploded", "component-callouts", "layer-reassembly"],
  "hologram-hud": ["hud-scan", "orbit-callouts", "spec-pulse"],
  "kinetic-typography": ["kinetic-type", "word-punch", "impact-cut"],
  "isometric-explainer": ["isometric-grid", "node-connectors", "diagram-build"],
  "cinematic-2d": ["2d-parallax", "layered-reveal", "cinematic-light"],
  "lifestyle-demo": ["lifestyle-broll", "match-cut", "picture-in-picture"],
  "data-storytelling": ["animated-metric", "data-viz", "number-counter"],
  "comparison-arena": ["split-screen", "scoreboard", "arena-impact"],
  "editorial-luxury": ["editorial-frame", "negative-space", "slow-drift"],
});

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function classifyNarrativeBeat(scene = {}, index = 0) {
  const text = normalize([
    scene.type, scene.kind, scene.visualCue, scene.text, scene.title,
    ...(Array.isArray(scene.brollKeywords) ? scene.brollKeywords : []),
  ].filter(Boolean).join(" "));
  if (/preco|valor|custo|oferta|desconto|parcel/.test(text)) return "price-check";
  if (/limitacao|ponto de atencao|ressalva|contra|nao tem|sem gps|sem nfc|incompatib|garantia/.test(text)) return "tradeoff";
  if (/compar|versus|\bvs\b|alternativa|concorrente|qual comprar/.test(text)) return "comparison";
  if (/veredito|vale a pena|recomend|para quem|conclus/.test(text)) return "verdict";
  if (/desmont|interno|componente|placa logica|sensor interno|arquitetura interna/.test(text)) return "teardown";
  if (/bateria|autonomia|mah|armazenamento|memoria ram|\bram\b|\bgb\b|\btb\b|\bhz\b|\bmp\b|\bw\b|\bghz\b|\bmhz\b|resolucao|\b2\.\d+k\b|processador|chip/.test(text)) return "specification";
  if (/tela|display|camera|acabamento|material|construcao|design|porta|audio|microfone|bluetooth|conexao|ergonomia|sensor/.test(text)) return "detail";
  if (/rotina|dia a dia|estudo|trabalho|jogo|jogos|assistir|mobilidade|portatil|conforto|uso real|viagem|cozinha|treino/.test(text)) return "lifestyle";
  if (index === 0) return "hook";
  return "feature";
}

function getTemplate(id) {
  return VETOR_VISUAL_TEMPLATES.find((template) => template.id === id);
}

/**
 * Creates a mixed, scene-level art direction. A video is not locked to a single
 * template: each beat gets a leading visual language plus supporting techniques.
 * All selections are deterministic so Remotion can reproduce the exact render.
 */
export function planVetorSceneMixes({
  scenes = [],
  title = "",
  category = "",
  manualTemplateId = null,
  hasProductGallery = false,
  hasBroll = false,
} = {}) {
  const manual = normalizeVetorTemplateId(manualTemplateId);
  let previousPrimary = null;

  return (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
    const beat = classifyNarrativeBeat(scene, index);
    const direction = DIRECTING[beat] || DIRECTING.feature;
    const aiSuggestions = Array.isArray(scene.visualTemplates)
      ? scene.visualTemplates.map(normalizeVetorTemplateId).filter(Boolean).slice(0, 3)
      : [];
    let primary = manual || aiSuggestions[0] || direction.primary;
    const suggestedSupport = aiSuggestions.slice(1);
    let support = [...suggestedSupport, ...direction.support]
      .filter((id, itemIndex, all) => id !== primary && all.indexOf(id) === itemIndex);

    // AI scene direction leads when present; heuristic direction fills missing layers.
    // Avoid consecutive repeated lead styles only when the AI did not explicitly choose one.
    if (!manual && !aiSuggestions.length && primary === previousPrimary && support.length > 0) {
      const next = support.shift();
      support.unshift(primary);
      primary = next;
    }
    previousPrimary = primary;

    const templateIds = [primary, ...support].filter((id, itemIndex, all) =>
      all.indexOf(id) === itemIndex && Boolean(getTemplate(id))
    );
    const visualLayers = [...new Set(templateIds.flatMap((id) => getTemplate(id)?.capabilities || LAYERS[id] || []))];
    const assets = {
      realProductImage: true,
      galleryCutaway: Boolean(hasProductGallery),
      lifestyleFootage: Boolean(hasBroll && (beat === "lifestyle" || beat === "feature")),
      brollAvailable: Boolean(hasBroll),
      dataMustComeFromScene: true,
    };
    const names = templateIds.map((id) => getTemplate(id)?.name).filter(Boolean);
    return {
      sceneId: scene.id ?? index + 1,
      narrativeBeat: beat,
      visualIntent: typeof scene.visualIntent === "string" ? scene.visualIntent.slice(0, 500) : "",
      directionSource: manual ? "manual-override" : aiSuggestions.length ? "ai-scene-direction" : "narrative-rules",
      primaryTemplate: primary,
      supportTemplates: templateIds.filter((id) => id !== primary),
      templateIds,
      templateNames: names,
      transitionIn: direction.transition,
      energy: direction.energy,
      rhythmSeconds: beat === "hook" || beat === "comparison" ? 1.8 : 2.5,
      visualLayers,
      assets,
      artDirection: [
        `Cena ${index + 1} de ${scenes.length}: ${beat}`,
        `Direção principal: ${getTemplate(primary)?.name || primary}`,
        `Combinação: ${names.slice(1).join(" + ") || "sem camada secundária"}`,
        title ? `Produto: ${title}` : "",
        category ? `Categoria: ${category}` : "",
        typeof scene.visualIntent === "string" ? `Intenção visual: ${scene.visualIntent.slice(0, 240)}` : "",
      ].filter(Boolean).join(" | "),
    };
  });
}
