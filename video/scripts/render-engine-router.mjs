import { normalizeLemoStyleId, resolveLemoStyle } from "./lemo-style-catalog.mjs";

const ENGINES = new Set(["auto", "remotion", "hyperframes", "lemo-opuscar"]);
const LEMO_STYLES = new Set(["cinematic-motion", "cinematic-product", "kinetic-typography", "data-film"]);
const HYPERFRAMES_STYLES = new Set(["rapid-montage", "newsreel", "documentary-montage", "kinetic-montage", "music-video"]);

export function normalizeRenderEngine(value) {
  const candidate = String(value || "auto").trim().toLowerCase();
  return ENGINES.has(candidate) ? candidate : "auto";
}

export function getRequestedRenderEngine(mediaAssets) {
  if (!Array.isArray(mediaAssets)) return null;
  const marker = mediaAssets.find((item) => item && item.type === "render_engine");
  return marker ? normalizeRenderEngine(marker.requested) : null;
}

function getVisualStyle(mediaAssets, videoData) {
  if (Array.isArray(mediaAssets)) {
    const marker = mediaAssets.find((item) => item && ["visual_style", "motion_style", "render_profile", "lemo_style"].includes(item.type));
    if (marker) return String(marker.style || marker.profile || marker.value || "").trim().toLowerCase();
  }
  return String(videoData?.visualStyle || videoData?.motionStyle || videoData?.renderProfile || "").trim().toLowerCase();
}

function hasAny(value, patterns) {
  const source = String(value || "").toLowerCase();
  return patterns.some((pattern) => source.includes(pattern));
}

export function resolveRenderEngine({ mediaAssets = [], videoData = {}, defaultEngine = "auto" } = {}) {
  const markerValue = getRequestedRenderEngine(mediaAssets);
  const requestedEngine = normalizeRenderEngine(markerValue || defaultEngine);
  const templateId = String(videoData.templateId || "").toLowerCase();
  const visualStyle = getVisualStyle(mediaAssets, videoData);
  const lemoStyleId = normalizeLemoStyleId(videoData.lemoStyleId || visualStyle);

  if (templateId === "stickman-review" || visualStyle === "stickman") {
    if (requestedEngine !== "auto" && requestedEngine !== "remotion") {
      throw new Error("O template Stickman é exclusivo do Remotion. Selecione Remotion ou Automático.");
    }
    return {
      requestedEngine,
      engine: "remotion",
      mode: requestedEngine === "remotion" ? "manual" : "automatic",
      reason: "O template Stickman possui composição e sincronização específicas do Remotion.",
    };
  }

  if (requestedEngine !== "auto") {
    return {
      requestedEngine,
      engine: requestedEngine,
      mode: "manual",
      reason: "Motor escolhido manualmente para este vídeo.",
    };
  }

  if (lemoStyleId) {
    const style = resolveLemoStyle(lemoStyleId);
    if (style.imageGenerationRequired && !(Array.isArray(videoData.imageGenerationAssets) && videoData.imageGenerationAssets.length)) {
      return { requestedEngine, engine: "remotion", mode: "automatic", reason: "O estilo " + style.name + " depende de arte gerada; Remotion mantém a fila segura até o asset estar disponível." };
    }
    return { requestedEngine, engine: "lemo-opuscar", mode: "automatic", reason: "O estilo Lemo-Opuscar " + style.name + " foi selecionado para esta direção visual." };
  }

  if (LEMO_STYLES.has(visualStyle)) {
    return {
      requestedEngine,
      engine: "lemo-opuscar",
      mode: "automatic",
      reason: "O perfil visual pede motion graphics cinematográficos gerados em código.",
    };
  }

  if (HYPERFRAMES_STYLES.has(visualStyle)) {
    return {
      requestedEngine,
      engine: "hyperframes",
      mode: "automatic",
      reason: "O perfil visual pede montagem rápida, cortes e ritmo editorial.",
    };
  }

  const scenes = Array.isArray(videoData.scenes) ? videoData.scenes : [];
  const hints = scenes.map((scene) => [
    scene?.visualEngine,
    scene?.visualStyle,
    scene?.visualCue,
    ...(Array.isArray(scene?.brollKeywords) ? scene.brollKeywords : []),
  ].filter(Boolean).join(" ")).join(" ");
  if (hasAny(hints, ["cinematic motion", "cinematic product", "kinetic typography", "code motion graphics", "data storytelling"])) {
    return {
      requestedEngine,
      engine: "lemo-opuscar",
      mode: "automatic",
      reason: "As indicações visuais das cenas pedem motion graphics cinematográficos.",
    };
  }
  if (hasAny(hints, ["rapid montage", "newsreel", "flash cut", "kinetic montage", "documentary montage"])) {
    return {
      requestedEngine,
      engine: "hyperframes",
      mode: "automatic",
      reason: "As indicações visuais pedem montagem editorial de cortes rápidos.",
    };
  }

  return {
    requestedEngine,
    engine: "remotion",
    mode: "automatic",
    reason: "Vídeo padrão: Remotion mantém as composições, legendas e QA já validados.",
  };
}

export function withRenderEngineSelection(mediaAssets, selection) {
  const assets = Array.isArray(mediaAssets) ? mediaAssets.filter((item) => item?.type !== "render_engine") : [];
  assets.push({
    type: "render_engine",
    requested: selection.requestedEngine,
    selected: selection.engine,
    mode: selection.mode,
    reason: selection.reason,
  });
  return assets;
}

export function shouldFallbackToRemotion(selection, explicitOverride = process.env.LEMO_REMOTION_FALLBACK || process.env.HYPERFRAMES_REMOTION_FALLBACK) {
  return selection?.mode === "automatic" || explicitOverride === "true";
}
