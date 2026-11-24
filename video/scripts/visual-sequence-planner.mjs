import { normalizeVetorTemplateId, VETOR_VISUAL_TEMPLATES } from "./visual-template-registry.mjs";
import { selectShotcraftRecipe } from "./shotcraft-recipe-registry.mjs";

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

function inferProductModelProfile(title = "", category = "") {
  const text = normalize([title, category].join(" "));
  if (/garrafa termica|garrafa de cafe|jarra termica|carafe|coffee pot/.test(text)) return "thermal-carafe";
  if (/smartphone|celular|iphone|galaxy s|redmi note|poco [a-z0-9]+/.test(text)) return "smartphone";
  if (/tablet|ipad|redmi pad|galaxy tab/.test(text)) return "tablet";
  if (/notebook|laptop|macbook|chromebook/.test(text)) return "laptop";
  if (/fone|headphone|headset|earbud|airpods|buds/.test(text)) return "headphones";
  if (/smartwatch|smart band|smartband|galaxy fit|relogio inteligente/.test(text)) return "wearable";
  return "unresolved";
}

const CAMERA_MOVES = Object.freeze([
  "orbit",
  "macro-dolly",
  "lateral-dolly",
  "crane",
  "push-in",
  "arc-reveal",
]);

function cameraMoveFor(beat, index, intent, previous) {
  const text = normalize(intent);
  let requested = null;
  if (/orbita|orbit|gira em torno|rotacao/.test(text)) requested = "orbit";
  else if (/macro|close up|close-up|aproxima|aproximacao|push.?in/.test(text)) requested = "macro-dolly";
  else if (/desliza|panoramica|tracking|lateral|para a esquerda|para a direita/.test(text)) requested = "lateral-dolly";
  else if (/de cima|top.?down|aerea|crane|elevacao/.test(text)) requested = "crane";
  else if (/revelacao|reveal|surge|entrada/.test(text)) requested = "arc-reveal";
  if (requested && requested !== previous) return requested;
  const preferred = beat === "detail" ? "macro-dolly"
    : beat === "lifestyle" ? "lateral-dolly"
    : beat === "teardown" ? "crane"
    : beat === "hook" ? "arc-reveal"
    : CAMERA_MOVES[index % CAMERA_MOVES.length];
  if (preferred !== previous) return preferred;
  return CAMERA_MOVES.find((move) => move !== previous) || "push-in";
}

export function buildSceneRenderPlan({
  scene = {},
  beat = "feature",
  primaryTemplate = "cinematic-2d",
  index = 0,
  title = "",
  category = "",
  hasBroll = false,
  previousCameraMove = null,
  verified3DModel = null,
  hasUnverified3DModel = false,
} = {}) {
  const productProfile = inferProductModelProfile(title, category);
  const cameraMove = cameraMoveFor(beat, index, scene.visualIntent, previousCameraMove);
  const verifiedComponents = Array.isArray(scene.verifiedComponents)
    ? scene.verifiedComponents.filter((item) => typeof item === "string" && item.trim()).slice(0, 12)
    : [];
  const modelAvailable = Boolean(
    verified3DModel?.verified === true &&
    typeof verified3DModel.url === "string" &&
    /^https:\/\//i.test(verified3DModel.url) &&
    /^[a-f0-9]{64}$/i.test(String(verified3DModel.sha256 || "")) &&
    typeof verified3DModel.verifiedBy === "string" && verified3DModel.verifiedBy.trim() &&
    Number.isFinite(Date.parse(String(verified3DModel.verifiedAt || "")))
  );
  let renderer = "layered-2d";
  let shotType = "cinematic-product-parallax";
  let action = "animate-product-image-layers-and-camera";
  let productRepresentation = "verified-product-photo";
  let fallbackReason = null;
  let assetRequirement = "verified-product-photo";

  if (primaryTemplate === "premium-product-3d" || primaryTemplate === "exploded-teardown") {
    if (modelAvailable || productProfile !== "unresolved") {
      renderer = "three-product";
      productRepresentation = modelAvailable ? "verified-gltf-model" : "parametric-archetype";
      shotType = primaryTemplate === "exploded-teardown" ? "exploded-product-stage" : beat === "detail" ? "3d-macro-tracking" : "3d-hero-orbit";
      action = primaryTemplate === "exploded-teardown"
        ? (verifiedComponents.length ? "separate-verified-components-and-reassemble" : "illustrative-layer-separation-only")
        : "rotate-product-and-move-camera";
      assetRequirement = modelAvailable ? "glb-or-gltf-model" : "supported-parametric-product-profile";
      if (!modelAvailable) {
        fallbackReason = hasUnverified3DModel
          ? "Um arquivo GLB foi encontrado, mas não possui manifesto de revisão humana completo; a cena usa somente um arquétipo 3D ilustrativo."
          : "Modelo 3D específico do produto não verificado; a cena usa somente um arquétipo 3D ilustrativo, sem afirmar fidelidade geométrica."; 
      }
      if (primaryTemplate === "exploded-teardown" && !verifiedComponents.length) {
        const schematicWarning = "Sem lista de componentes documentados: a separação é apenas esquemática e não representa uma desmontagem técnica.";
        fallbackReason = fallbackReason ? fallbackReason + " " + schematicWarning : schematicWarning;
      }
    } else {
      renderer = "layered-2d";
      productRepresentation = "verified-product-photo";
      shotType = "macro-parallax-photo";
      action = "multi-plane-parallax-and-camera-dolly";
      assetRequirement = "verified-product-gallery";
      fallbackReason = "Modelo 3D do produto não disponível e categoria sem perfil paramétrico; preservar fotografia real com parallax 2.5D, sem fingir um modelo 3D.";
    }
  } else if (primaryTemplate === "lifestyle-demo") {
    if (hasBroll) {
      renderer = "cinematic-footage";
      shotType = "full-bleed-lifestyle-action";
      action = "play-real-footage-with-camera-drift-and-match-cut";
      assetRequirement = "matched-lifestyle-video";
    } else {
      renderer = "layered-2d";
      shotType = "editorial-context-parallax";
      action = "animate-verified-images-with-context-panels";
      assetRequirement = "matched-lifestyle-video";
      fallbackReason = "B-roll contextual não encontrado; usar imagens verificadas e composição 2.5D, sem simular uma demonstração real.";
    }
  } else if (primaryTemplate === "hologram-hud" || primaryTemplate === "isometric-explainer") {
    renderer = "three-motion-graphics";
    shotType = primaryTemplate === "hologram-hud" ? "3d-hud-orbit" : "isometric-world-build";
    action = primaryTemplate === "hologram-hud" ? "build-3d-data-panels-around-product" : "assemble-isometric-scene-and-camera-crane";
    assetRequirement = "scene-data-and-verified-product-image";
  } else if (primaryTemplate === "data-storytelling" || primaryTemplate === "comparison-arena") {
    renderer = "motion-graphics";
    shotType = primaryTemplate === "comparison-arena" ? "split-screen-arena" : "animated-data-sequence";
    action = primaryTemplate === "comparison-arena" ? "animate-comparison-entries-and-scoreboard" : "build-metrics-as-narrative";
    assetRequirement = "verified-scene-data";
  } else if (primaryTemplate === "kinetic-typography") {
    renderer = "motion-graphics";
    shotType = "kinetic-type-impact";
    action = "animate-words-to-narration-beats-with-impact-cuts";
    assetRequirement = "narration-timing";
  } else if (primaryTemplate === "editorial-luxury") {
    renderer = productProfile !== "unresolved" || modelAvailable ? "three-product" : "layered-2d";
    productRepresentation = modelAvailable ? "verified-gltf-model" : productProfile !== "unresolved" ? "parametric-archetype" : "verified-product-photo";
    shotType = renderer === "three-product" ? "editorial-3d-hero" : "editorial-photo-dolly";
    action = renderer === "three-product" ? "slow-product-orbit-with-light-sweep" : "slow-photo-dolly-with-depth-layers";
    assetRequirement = renderer === "three-product" ? "product-model-or-parametric-profile" : "verified-product-photo";
    if (renderer === "three-product" && !modelAvailable) {
      fallbackReason = hasUnverified3DModel
        ? "O arquivo GLB não foi aprovado pelo contrato de revisão; usar apenas o arquétipo 3D ilustrativo."
        : "Sem modelo 3D do produto aprovado; usar apenas o arquétipo 3D ilustrativo.";
    }
  }

  return {
    version: 2,
    renderer,
    shotType,
    action,
    cameraMove,
    productProfile,
    productRepresentation,
    assetRequirement,
    hasMatchedBroll: Boolean(hasBroll),
    verifiedComponents,
    usesTrueProductGeometry: renderer === "three-product" && modelAvailable,
    visualFidelity: renderer === "three-product" ? (modelAvailable ? "verified-3d-asset" : "illustrative-parametric-3d") : "verified-media-2.5d",
    modelAssetStatus: modelAvailable ? "verified" : hasUnverified3DModel ? "unverified" : "missing",
    modelAssetSha256: modelAvailable ? verified3DModel.sha256 : null,
    modelAssetVerifiedBy: modelAvailable ? verified3DModel.verifiedBy : null,
    modelAssetVerifiedAt: modelAvailable ? verified3DModel.verifiedAt : null,
    motionContract: {
      cameraMustMove: true,
      objectMustMove: renderer === "three-product",
      minCameraTravel: renderer === "three-product" ? 0.55 : 0.025,
      minScaleDelta: renderer === "three-product" ? 0.08 : 0.035,
    },
    fallbackReason,
  };
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
  verified3DModel = null,
  hasUnverified3DModel = false,
  manualShotcraftRecipeId = null,
} = {}) {
  const manual = normalizeVetorTemplateId(manualTemplateId);
  let previousPrimary = null;
  let previousCameraMove = null;
  let previousShotcraftRecipeId = null;

  return (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
    const beat = classifyNarrativeBeat(scene, index);
    const direction = DIRECTING[beat] || DIRECTING.feature;
    const sceneHasBroll = Array.isArray(hasBroll) ? Boolean(hasBroll[index]) : Boolean(hasBroll);
    const aiSuggestions = Array.isArray(scene.visualTemplates)
      ? scene.visualTemplates.map(normalizeVetorTemplateId).filter(Boolean).slice(0, 3)
      : [];
    let primary = manual || aiSuggestions[0] || direction.primary;
    const suggestedSupport = aiSuggestions.slice(1);
    let support = (aiSuggestions.length
      ? [...suggestedSupport, ...direction.support]
      : direction.support
    ).filter((id, itemIndex, all) => id !== primary && all.indexOf(id) === itemIndex).slice(0, 2);

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
    const shotcraftRecipe = selectShotcraftRecipe({
      beat,
      sceneRecipeId: scene.shotcraftRecipeId,
      manualRecipeId: manualShotcraftRecipeId,
      previousRecipeId: previousShotcraftRecipeId,
    });
    previousShotcraftRecipeId = shotcraftRecipe.id;
    const visualLayers = [...new Set(templateIds.flatMap((id) => getTemplate(id)?.capabilities || LAYERS[id] || []))];
    const assets = {
      realProductImage: true,
      galleryCutaway: Boolean(hasProductGallery),
      lifestyleFootage: Boolean(sceneHasBroll && (beat === "lifestyle" || beat === "feature")),
      brollAvailable: sceneHasBroll,
      dataMustComeFromScene: true,
    };
    const names = templateIds.map((id) => getTemplate(id)?.name).filter(Boolean);
    const renderPlan = buildSceneRenderPlan({ scene, beat, primaryTemplate: primary, index, title, category, hasBroll: sceneHasBroll, previousCameraMove, verified3DModel, hasUnverified3DModel });
    previousCameraMove = renderPlan.cameraMove;
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
      shotcraftRecipeId: shotcraftRecipe.id,
      shotcraftRecipeCategory: shotcraftRecipe.category,
      shotcraftRecipeSelection: shotcraftRecipe.selection,
      energy: direction.energy,
      rhythmSeconds: beat === "hook" || beat === "comparison" ? 1.8 : 2.5,
      visualLayers,
      renderPlan,
      assets,
      artDirection: [
        `Cena ${index + 1} de ${scenes.length}: ${beat}`,
        `Direção principal: ${getTemplate(primary)?.name || primary}`,
        `Combinação: ${names.slice(1).join(" + ") || "sem camada secundária"}`,
        `Shotcraft: ${shotcraftRecipe.id} (${shotcraftRecipe.selection})`,
        title ? `Produto: ${title}` : "",
        category ? `Categoria: ${category}` : "",
        typeof scene.visualIntent === "string" ? `Intenção visual: ${scene.visualIntent.slice(0, 240)}` : "",
      ].filter(Boolean).join(" | "),
    };
  });
}
