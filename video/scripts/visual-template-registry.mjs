/**
 * Vetor-owned visual template registry.
 * Original creative directions; no third-party style prompts or documentation are embedded.
 * Remotion remains the default renderer. Other engines are explicit opt-ins.
 */

export const VETOR_VISUAL_TEMPLATES = Object.freeze([
  {
    id: "premium-product-3d",
    name: "Premium Product 3D",
    description: "Hero shot premium, profundidade, luz de estúdio e movimentos de câmera suaves.",
    categories: ["smartphones", "tablets", "notebooks", "wearables", "audio", "eletronicos"],
    keywords: ["premium", "design", "acabamento", "tela", "produto"],
    visualCues: ["hero reveal com parallax", "macro de acabamento e materiais", "rotação de produto com luz de recorte"],
    motion: "slow-orbit",
    transition: "cinematic-wipe",
    renderer: "remotion",
    capabilities: ["three-orbit", "macro-camera", "light-sweep", "product-hero"],
    priority: 100,
  },
  {
    id: "exploded-teardown",
    name: "Exploded Teardown",
    description: "Desmontagem visual em camadas para explicar componentes e construção.",
    categories: ["smartphones", "notebooks", "audio", "eletronicos", "hardware"],
    keywords: ["componentes", "chip", "processador", "sensor", "construcao", "interno"],
    visualCues: ["explosão de camadas com rótulos", "close-up técnico de componente", "recomposição do produto"],
    motion: "layer-separation",
    transition: "component-snap",
    renderer: "remotion",
    capabilities: ["three-exploded", "component-callouts", "layer-reassembly"],
    priority: 95,
  },
  {
    id: "hologram-hud",
    name: "Hologram HUD",
    description: "Interface técnica com indicadores, gráficos e dados em destaque.",
    categories: ["smartphones", "tablets", "notebooks", "wearables", "games", "hardware"],
    keywords: ["especificacoes", "benchmark", "hz", "mah", "gb", "tb", "nits", "amole d", "gps"],
    visualCues: ["HUD com dados orbitando o produto", "medidor animado de especificação", "painel técnico com leitura rápida"],
    motion: "hud-orbit",
    transition: "scan-reveal",
    renderer: "remotion",
    capabilities: ["hud-scan", "orbit-callouts", "spec-pulse"],
    priority: 90,
  },
  {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    description: "Tipografia expressiva, frases curtas e ritmo guiado pela narração.",
    categories: ["audio", "games", "acessorios", "utilidades", "beleza"],
    keywords: ["vale a pena", "melhor", "pior", "surpreende", "atenção", "cuidado", "preco"],
    visualCues: ["palavra-chave em escala cinética", "tipografia em ritmo de fala", "headline com punch-in e corte"],
    motion: "type-punch",
    transition: "word-swipe",
    renderer: "remotion",
    capabilities: ["kinetic-type", "word-punch", "impact-cut"],
    priority: 88,
  },
  {
    id: "isometric-explainer",
    name: "Isometric Explainer",
    description: "Cenários isométricos e diagramas para explicar uso, conectividade e fluxo.",
    categories: ["smart-home", "redes", "computadores", "games", "utilidades"],
    keywords: ["conexao", "wifi", "bluetooth", "ecossistema", "compatibilidade", "instalacao"],
    visualCues: ["diagrama isométrico do ambiente", "fluxo de conexão em perspectiva", "cenário de uso em miniatura"],
    motion: "isometric-pan",
    transition: "diagram-build",
    renderer: "remotion",
    capabilities: ["isometric-grid", "node-connectors", "diagram-build"],
    priority: 86,
  },
  {
    id: "cinematic-2d",
    name: "Cinematic 2D",
    description: "Narrativa 2D com recortes, parallax, silhuetas e transições cinematográficas.",
    categories: ["audio", "wearables", "casa", "utilidades", "beleza", "acessorios"],
    keywords: ["rotina", "experiencia", "portabilidade", "conforto", "uso diario"],
    visualCues: ["cena 2D em camadas com parallax", "sequência de uso com recortes animados", "revelação com luz e profundidade"],
    motion: "2d-parallax",
    transition: "layered-wipe",
    renderer: "remotion",
    capabilities: ["2d-parallax", "layered-reveal", "cinematic-light"],
    priority: 84,
  },
  {
    id: "lifestyle-demo",
    name: "Lifestyle Demo",
    description: "Demonstração contextual do produto em situações reais de uso.",
    categories: ["casa", "cozinha", "beleza", "audio", "wearables", "utilidades"],
    keywords: ["rotina", "cozinha", "casa", "trabalho", "estudo", "treino", "viagem"],
    visualCues: ["produto em contexto de uso", "sequência problema-solução", "benefício demonstrado em situação cotidiana"],
    motion: "handheld-drift",
    transition: "match-cut",
    renderer: "remotion",
    capabilities: ["lifestyle-broll", "match-cut", "picture-in-picture"],
    priority: 82,
  },
  {
    id: "data-storytelling",
    name: "Data Storytelling",
    description: "Comparações, números e evidências apresentados como narrativa visual.",
    categories: ["smartphones", "tablets", "notebooks", "hardware", "games", "wearables"],
    keywords: ["comparativo", "versus", "bateria", "autonomia", "preco", "desempenho", "nota"],
    visualCues: ["gráfico animado com dado confirmado", "comparação lado a lado", "número-chave em destaque"],
    motion: "chart-build",
    transition: "data-wipe",
    renderer: "remotion",
    capabilities: ["animated-metric", "data-viz", "number-counter"],
    priority: 92,
  },
  {
    id: "comparison-arena",
    name: "Comparison Arena",
    description: "Duelo visual entre alternativas, com critérios e veredito claro.",
    categories: ["smartphones", "tablets", "notebooks", "games", "audio", "wearables"],
    keywords: ["vs", "versus", "comparar", "qual comprar", "melhor escolha", "duelo"],
    visualCues: ["entrada dos dois produtos em lados opostos", "placar por critério", "veredito com vencedor contextual"],
    motion: "split-screen-impact",
    transition: "arena-slam",
    renderer: "remotion",
    capabilities: ["split-screen", "scoreboard", "arena-impact"],
    priority: 98,
  },
  {
    id: "editorial-luxury",
    name: "Editorial Luxury",
    description: "Direção editorial minimalista, tipografia refinada e composição limpa.",
    categories: ["smartphones", "notebooks", "audio", "wearables", "casa"],
    keywords: ["premium", "minimalista", "acabamento", "elegante", "design"],
    visualCues: ["composição editorial com espaço negativo", "detalhe de material em macro", "produto em pedestal minimalista"],
    motion: "editorial-drift",
    transition: "soft-cut",
    renderer: "remotion",
    capabilities: ["editorial-frame", "negative-space", "slow-drift"],
    priority: 80,
  },
]);

const normalize = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const ALIASES = new Map([
  ["premium-3d", "premium-product-3d"],
  ["premium 3d", "premium-product-3d"],
  ["premium product", "premium-product-3d"],
  ["exploded", "exploded-teardown"],
  ["teardown", "exploded-teardown"],
  ["hud", "hologram-hud"],
  ["holographic-hud", "hologram-hud"],
  ["kinetic-type", "kinetic-typography"],
  ["isometric", "isometric-explainer"],
  ["cinematic", "cinematic-2d"],
  ["lifestyle", "lifestyle-demo"],
  ["data-film", "data-storytelling"],
  ["comparison", "comparison-arena"],
  ["luxury", "editorial-luxury"],
]);

export function normalizeVetorTemplateId(value) {
  const key = normalize(value);
  if (!key) return null;
  const compact = key.replace(/ /g, "-");
  if (VETOR_VISUAL_TEMPLATES.some((template) => template.id === compact)) return compact;
  return ALIASES.get(key) || null;
}

export function resolveVetorVisualTemplate({ mediaAssets = [], videoData = {}, script = {} } = {}) {
  const explicit = Array.isArray(mediaAssets)
    ? mediaAssets.find((asset) => asset && ["visual_template", "visual_style", "motion_style", "render_profile"].includes(asset.type))
    : null;
  const requested = normalizeVetorTemplateId(
    explicit?.templateId || explicit?.template || explicit?.style || explicit?.profile || explicit?.value ||
    videoData.visualTemplateId || videoData.templateId || script.visualTemplateId || script.visualStyle
  );
  if (requested) {
    const template = VETOR_VISUAL_TEMPLATES.find((item) => item.id === requested);
    return { ...template, selection: "manual" };
  }

  const text = normalize([
    videoData.title, videoData.category, videoData.productCategory,
    script.contentType, script.topicTitle,
    ...(Array.isArray(videoData.scenes) ? videoData.scenes.map((scene) => [scene.text, scene.visualCue].join(" ")) : []),
  ].filter(Boolean).join(" "));
  const category = normalize(videoData.category || videoData.productCategory);
  const isComparison = /comparativo|comparar|versus|\bvs\b|qual comprar/.test(text);
  if (isComparison) return { ...VETOR_VISUAL_TEMPLATES.find((item) => item.id === "comparison-arena"), selection: "automatic" };

  const ranked = VETOR_VISUAL_TEMPLATES.map((template) => {
    let score = 0;
    if (template.categories.some((item) => category.includes(normalize(item)))) score += 3;
    for (const keyword of template.keywords) if (text.includes(normalize(keyword))) score += 2;
    return { template, score: score + template.priority / 1000 };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const fallback = VETOR_VISUAL_TEMPLATES.find((item) => item.id === "premium-product-3d");
  return { ...(best && best.score > 0.1 ? best.template : fallback), selection: "automatic" };
}

export function listVetorVisualTemplates() {
  return VETOR_VISUAL_TEMPLATES.map(({ id, name, description, motion, transition, renderer }) => ({
    id, name, description, motion, transition, renderer,
  }));
}
