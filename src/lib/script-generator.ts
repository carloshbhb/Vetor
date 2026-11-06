import { chatCompletion, getLLMProvider } from './llm-provider';
import { stripSpokenUrls } from '../../video/scripts/video-format.mjs';

export interface VideoScript {
  hook: string;
  scenes: VideoScene[];
  totalDuration: number;
  callToAction: string;
  generationVersion?: 3;
  videoFormat?: "short" | "long";
  creativeAngle?: string;
  score?: number;
}

export interface VideoScene {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
  brollKeywords: string[];
}

export interface ProductInfo {
  title: string;
  category: string;
  price: string;
  specifications?: Record<string, string>;
  marketplace: string;
  editorialContext?: string;
  creativeAngle?: string;
  recentHooksToAvoid?: string[];
  videoFormat?: "short" | "long";
  researchBrief?: string;
}

export function buildScriptPrompt(product: ProductInfo): string {
  const isLong = product.videoFormat === "long";
  const specs = product.specifications && Object.keys(product.specifications).length
    ? Object.entries(product.specifications).map(([key, value]) => "- " + key + ": " + value).join("\n")
    : "Nenhuma especificação estruturada foi fornecida.";
  const context = (product.editorialContext || "Não há mais dados editoriais disponíveis.")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 6500);
  const hooks = (product.recentHooksToAvoid || []).filter(Boolean).slice(0, 12)
    .map((hook) => "- " + String(hook).slice(0, 180)).join("\n") || "- Nenhum roteiro anterior foi fornecido.";
  const instructions = isLong
    ? "VÍDEO LONGO HORIZONTAL, 4–7 MINUTOS. Crie 8–10 cenas de 29–40 segundos e aproximadamente 55–85 palavras por cena. Conte uma decisão de compra completa: pergunta central, contexto, recursos que importam, implicações práticas baseadas nos fatos fornecidos, limitações, para quem serve/não serve, critérios de comparação e veredito. Cada visualCue deve ser um capítulo específico. Não leia a ficha técnica."
    : "YOUTUBE SHORTS VERTICAL, 60–90 SEGUNDOS. Crie 6–7 cenas de 9–10 segundos e aproximadamente 18–28 palavras por cena. Um único assunto, gancho nos dois primeiros segundos, argumentos específicos e decisão rápida.";

  return [
    "Você é roteirista editorial e apresentador de tecnologia do Vetor.blog. Escreva em português brasileiro natural, para ser falado por uma pessoa real.",
    "OBJETIVO COMERCIAL: ajude a pessoa a decidir se o produto serve para seu uso e o que precisa conferir antes de comprar. Entregue valor antes de convidar a consultar o review e a oferta. Nunca prometa desconto, estoque, testes ou economia sem fonte.",
    "PRODUTO: " + product.title,
    "Categoria: " + product.category + " | Preço informado: " + product.price + " | Marketplace: " + product.marketplace,
    "Formato: " + (isLong ? "Vídeo longo" : "Short"),
    "ESPECIFICAÇÕES DOCUMENTADAS:\n" + specs,
    "CONTEXTO EDITORIAL REAL:\n" + context,
    "PESQUISA SERP + YOUTUBE:\n" + (product.researchBrief || "Não disponível."),    "ÂNGULO NARRATIVO OBRIGATÓRIO:\n" + (product.creativeAngle || "Escolha o ângulo mais específico para este produto."),
    "Esse ângulo deve guiar a abertura, ordem dos argumentos, exemplos e conclusão; não troque apenas o nome do produto num roteiro padrão.",
    "ABERTURAS RECENTES A NÃO IMITAR:\n" + hooks,
    "TOM E PRECISÃO: seja conversacional, idiomático e seguro. Varie cadência e construção. Evite propaganda, superlativos vazios, listas mecânicas e frases burocráticas. Não alegue testes ou experiências pessoais. Não invente especificações, compatibilidade, autonomia, desempenho, acessórios, avaliações ou preços. Se um dado faltar, diga exatamente o que o comprador deve confirmar. Cada cena acrescenta uma ideia nova e concreta.",
    instructions,
    'Retorne somente JSON válido com esta estrutura: {"hook":"abertura específica e curiosa","scenes":[{"id":1,"text":"narração factual e natural","duration":' + (isLong ? "32" : "9") + ',"visualCue":"ação ou capítulo visual único","brollKeywords":["termo visual concreto em inglês"]}],"callToAction":"convite para consultar review e preço atualizado"}',
    'Não escreva URLs, domínios nem endereços no callToAction: diga apenas "no link da descrição".'
  ].join("\n\n");
}

function normalizeHookTokens(value: string): Set<string> {
  const stopwords = new Set(["antes", "depois", "sobre", "para", "este", "esta", "isso", "esse", "essa", "como", "qual", "vale", "pena", "produto", "veja", "aqui", "mais", "muito", "seu", "sua", "com", "sem", "uma", "que", "por", "dos", "das"]);
  return new Set(value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !stopwords.has(word)));
}

function hookSimilarity(left: string, right: string): number {
  const a = normalizeHookTokens(left);
  const b = normalizeHookTokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function isDistinctScriptResponse(content: string, product: ProductInfo): boolean {
  try {
    const parsed = JSON.parse(content);
    const isLong = product.videoFormat === "long";
    const minScenes = isLong ? 8 : 6;
    const maxScenes = isLong ? 10 : 7;
    const minDuration = isLong ? 29 : 9;
    const maxDuration = isLong ? 40 : 10;
    if (typeof parsed.hook !== "string" || !parsed.hook.trim()) return false;
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length < minScenes || parsed.scenes.length > maxScenes) return false;
    if (parsed.scenes.some((scene: any) =>
      !scene || typeof scene.text !== "string" ||
      scene.text.trim().split(/\s+/).length < (isLong ? 35 : 8) ||
      !Number.isFinite(scene.duration) || scene.duration < minDuration || scene.duration > maxDuration ||
      typeof scene.visualCue !== "string" || !scene.visualCue.trim() ||
      !Array.isArray(scene.brollKeywords)
    )) return false;
    const cues = parsed.scenes.map((scene: any) => scene.visualCue.trim().toLowerCase());
    if (new Set(cues).size < Math.min(6, cues.length)) return false;
    const banned = [/está na categoria/i, /o preço informado é/i, /antes de comprar .{0,100} confira a versão exata/i, /pare! antes de comprar/i, /testamos|em nossos testes|nos nossos testes|medimos|testei pessoalmente/i];
    if (banned.some((pattern) => pattern.test([parsed.hook, ...parsed.scenes.map((scene: any) => scene.text)].join(" ")))) return false;
    const seconds = parsed.scenes.reduce((sum: number, scene: any) => sum + Number(scene.duration || 0), 8);
    if (isLong && (seconds < 240 || seconds > 420)) return false;
    if (!isLong && (seconds < 60 || seconds > 90)) return false;
    return !(product.recentHooksToAvoid || []).some((hook) => hookSimilarity(parsed.hook, hook) >= 0.68);
  } catch { return false; }
}

export function getVideoScriptGenerationBudget() {
  return {
    // Respect the route's 60-second Vercel limit while reserving time for
    // both provider fallbacks after two free OpenRouter quality attempts.
    deadlineMs: 55000,
    maxOpenRouterModels: 2,
    maxAttemptsPerModel: 1 as const,
    providerTimeouts: {
      openrouter: 12000,
      groq: 9000,
      nvidia: 25000,
    },
  };
}

export async function generateVideoScript(product: ProductInfo): Promise<VideoScript> {
  const prompt = buildScriptPrompt(product);
  const isLong = product.videoFormat === "long";
  getLLMProvider();
  const content = await chatCompletion({
    systemPrompt: "Você é roteirista editorial de tecnologia do Vetor.blog. Produza roteiro falado, natural, factual e distinto. Responda somente JSON válido.",
    userPrompt: prompt,
    temperature: isLong ? 0.74 : 0.82,
    maxTokens: isLong ? 3000 : 1600,
    ...getVideoScriptGenerationBudget(),
    responseFormat: { type: "json_object" },
    validateResponse: (candidate) => isDistinctScriptResponse(candidate, product),
  });

  let parsed: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Modelo não retornou JSON.");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error("[video-script] JSON inválido: " + (error instanceof Error ? error.message : String(error)));
  }

  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  const minScenes = isLong ? 8 : 6;
  const maxScenes = isLong ? 10 : 7;
  const minDuration = isLong ? 29 : 9;
  const maxDuration = isLong ? 40 : 10;
  if (
    typeof parsed.hook !== "string" || !parsed.hook.trim() ||
    scenes.length < minScenes || scenes.length > maxScenes ||
    scenes.some((scene: unknown) => {
      if (!scene || typeof scene !== "object") return true;
      const item = scene as Partial<VideoScene>;
      return typeof item.text !== "string" || item.text.trim().split(/\s+/).length < (isLong ? 35 : 8) ||
        !Number.isFinite(item.duration) || (item.duration as number) < minDuration || (item.duration as number) > maxDuration ||
        typeof item.visualCue !== "string" || !item.visualCue.trim() || !Array.isArray(item.brollKeywords);
    })
  ) throw new Error("[video-script] Roteiro reprovado: estrutura, duração ou cenas incompletas.");

  const sceneSeconds = scenes.reduce((sum: number, scene: VideoScene) => sum + scene.duration, 0);
  const computedDuration = sceneSeconds + 8;
  if (isLong && (computedDuration < 240 || computedDuration > 420)) {
    throw new Error("[video-script] Duração longa fora de 4–7 minutos: " + computedDuration + "s.");
  }
  if (!isLong && (computedDuration < 60 || computedDuration > 90)) {
    throw new Error("[video-script] Duração do Short inválida: " + computedDuration + "s.");
  }
  const scriptText = [parsed.hook, ...scenes.map((scene: VideoScene) => scene.text), parsed.callToAction || ""].join(" ");
  if (/\b(testamos|vamos testar|vou testar|em nossos testes|nos nossos testes|medimos|rodo tudo liso|sem engasgos)\b/i.test(scriptText)) {
    throw new Error("[video-script] Roteiro reprovado: alegação de teste/experiência não fornecida.");
  }

  return {
    hook: parsed.hook.trim(),
    scenes: scenes as VideoScene[],
    totalDuration: computedDuration,
    callToAction: stripSpokenUrls(parsed.callToAction) ||
      "Veja o review completo e confira a oferta atual na descrição.",
    generationVersion: 3,
    videoFormat: product.videoFormat || "short",
    creativeAngle: product.creativeAngle || "Ângulo editorial definido pelo gerador.",
  };
}

export type ComparisonSceneType = 'product1' | 'product2' | 'comparison';

export interface ComparisonVideoScene extends VideoScene {
  type: ComparisonSceneType;
}

export interface ComparisonVideoScript {
  hook: string;
  scenes: ComparisonVideoScene[];
  totalDuration: number;
  callToAction: string;
  generationVersion?: 3;
  videoFormat?: "short";
  creativeAngle?: string;
}

export function isValidComparisonVideoScriptResponse(
  response: string,
  product1Name: string,
  product2Name: string
): boolean {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return false;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.hook !== "string" || !parsed.hook.trim()) return false;
    if (typeof parsed.callToAction !== "string" || !parsed.callToAction.trim()) return false;
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length < 6 || parsed.scenes.length > 7) return false;

    const validTypes = new Set(["product1", "product2", "comparison"]);
    if (parsed.scenes.some((scene: any) =>
      !scene || typeof scene !== "object" ||
      typeof scene.text !== "string" || scene.text.trim().split(/\s+/).length < 8 ||
      !Number.isFinite(scene.duration) || scene.duration < 9 || scene.duration > 10 ||
      !validTypes.has(scene.type) ||
      typeof scene.visualCue !== "string" || !scene.visualCue.trim() ||
      !Array.isArray(scene.brollKeywords) ||
      scene.brollKeywords.some((keyword: unknown) => typeof keyword !== "string" || !keyword.trim())
    )) return false;

    const cues = parsed.scenes.map((scene: any) => scene.visualCue.trim().toLowerCase());
    if (new Set(cues).size < 6) return false;
    const transcript = [parsed.hook, ...parsed.scenes.map((scene: any) => scene.text), parsed.callToAction].join(" ");
    const unsupportedClaims =
      /\b(?:exynos|snapdragon|dimensity|bluetooth|wi-?fi|amoled|oled|ips|anc|cancelamento de ru[ií]do|driver|mAh|mah|megapixels?|nits|usb-?c|ipx\d?)\b|\b\d+(?:[.,]\d+)?\s*(?:mm|mah|gb|tb|hz|mp|w|wh|db|horas?|dias?|anos?|%)\b/i;
    const unsupportedOpinion = /\b(?:vencedor|ganhador|superior|melhor que|melhor do que|nota final)\b/i;
    if (unsupportedClaims.test(transcript) || unsupportedOpinion.test(transcript)) return false;

    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedTranscript = normalize(transcript);
    if (!normalizedTranscript.includes(normalize(product1Name)) || !normalizedTranscript.includes(normalize(product2Name))) return false;

    const duration = parsed.scenes.reduce((sum: number, scene: any) => sum + Number(scene.duration), 8);
    return duration >= 60 && duration <= 90;
  } catch {
    return false;
  }
}

export async function generateComparisonVideoScript(input: {
  title: string;
  category: string;
  product1: { name: string };
  product2: { name: string };
  comparisonUrl: string;
}): Promise<ComparisonVideoScript> {
  const product1Name = input.product1.name.trim();
  const product2Name = input.product2.name.trim();
  if (!product1Name || !product2Name || product1Name === product2Name) {
    throw new Error("[comparison-video-script] Dois nomes distintos de produtos são obrigatórios.");
  }
  const prompt = [
    "Crie um roteiro editorial para YouTube Shorts de 60 a 90 segundos comparando \"" + product1Name + "\" e \"" + product2Name + "\".",
    "Categoria: " + input.category,
    "Título do comparativo: " + input.title,
    "URL canônica do comparativo: " + input.comparisonUrl,
    "",
    "DADOS CONFIRMADOS: somente os nomes dos produtos, a categoria e o título acima.",
    "Não foram fornecidas fichas técnicas verificadas, medições, preços atuais, recursos confirmados ou avaliações.",
    "",
    "Retorne apenas JSON com hook, scenes e callToAction. Cada cena deve conter id, type, text, duration, visualCue e brollKeywords.",
    "Use 6 ou 7 cenas, cada uma com 9 ou 10 segundos. Cada type deve ser product1, product2 ou comparison.",
    "",
    "REGRAS FACTUAIS OBRIGATÓRIAS:",
    "- Não invente nem mencione processadores, chipsets, câmera, tela, conectividade, Bluetooth, ANC, drivers, autonomia, bateria, potência, dimensões, materiais, certificações, preços ou resultados.",
    "- Não use dados presentes em outros artigos, páginas ou conhecimento de memória; neste roteiro só os nomes e a categoria foram confirmados pelo sistema.",
    "- Não declare vencedor, superioridade, notas, medições, testes ou experiência pessoal.",
    "- Oriente o público a comparar a ficha oficial da versão exata, compatibilidade, garantia, conteúdo da embalagem, preço total e necessidades de uso.",
    "- Quando faltar informação, apresente como pergunta ou critério a conferir, nunca como fato.",
    "- Use os nomes completos de ambos os produtos ao menos uma vez na narração.",
    "- As cenas devem ter visualCue distintos e brollKeywords concretos, sem sugerir teste que não ocorreu.",
    "- Não escreva URLs, domínios nem endereços no callToAction: diga apenas \"no link da descrição\".",
    "- O total, somando 8 segundos de abertura/encerramento à duração das cenas, deve ficar entre 60 e 90 segundos.",
    "- CTA sem preço, desconto ou estoque não confirmado. Peça para consultar o comparativo e verificar as condições atuais.",
    "- Responda em português brasileiro natural e somente em JSON válido.",
  ].join("\n");

  try {
    getLLMProvider();
    const response = await chatCompletion({
      systemPrompt: "Você é roteirista editorial de tecnologia do Vetor.blog. Fatos inventados são proibidos. Responda somente JSON válido.",
      userPrompt: prompt,
      temperature: 0.35,
      maxTokens: 1800,
      ...getVideoScriptGenerationBudget(),
      responseFormat: { type: "json_object" },
      validateResponse: (candidate) => isValidComparisonVideoScriptResponse(candidate, product1Name, product2Name),
    });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Modelo não retornou JSON.");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!isValidComparisonVideoScriptResponse(response, product1Name, product2Name)) {
      throw new Error("Roteiro reprovado: estrutura incompleta ou afirmação técnica sem evidência.");
    }

    const scenes = parsed.scenes as ComparisonVideoScene[];
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 8);
    return {
      hook: parsed.hook.trim(),
      scenes,
      totalDuration,
      callToAction: stripSpokenUrls(parsed.callToAction) ||
        "Veja o comparativo completo e confira os dados oficiais no link da descrição.",
      generationVersion: 3,
      videoFormat: "short",
      creativeAngle: "Comparação factual: nomes e categoria confirmados; demais características devem ser conferidas nas fichas oficiais.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error("[comparison-video-script] " + message);
  }
}
function generateDefaultScenes(product: ProductInfo): VideoScene[] {
  return [
    {
      id: 1,
      text: `Chegou o ${product.title}, será que vale o investimento?`,
      duration: 9,
      visualCue: 'Produto em destaque com zoom dramático',
      brollKeywords: ['product reveal', 'tech unboxing'],
    },
    {
      id: 2,
      text: `O preço informado é ${product.price}; confirme o valor e as condições no anúncio antes de comprar.`,
      duration: 9,
      visualCue: 'Preço aparecendo na tela, transição para produto em mãos',
      brollKeywords: ['price tag', 'money', 'shopping'],
    },
    {
      id: 3,
      text: 'Confira os materiais e os detalhes de construção descritos pelo fabricante.',
      duration: 9,
      visualCue: 'Close nos detalhes, materiais, acabamento',
      brollKeywords: ['product close up', 'premium design', 'hands on'],
    },
    {
      id: 4,
      text: 'Compare os recursos documentados com as tarefas que você pretende realizar.',
      duration: 9,
      visualCue: 'Produto em uso real: apps, jogos, multitarefa',
      brollKeywords: ['performance test', 'gaming', 'multitasking'],
    },
    {
      id: 5,
      text: 'Confirme autonomia, carregamento e requisitos na ficha técnica da versão exata.',
      duration: 9,
      visualCue: 'Ícone de bateria, carregador, uso contínuo',
      brollKeywords: ['battery life', 'charging', 'all day'],
    },
    {
      id: 6,
      text: 'Antes de comprar, confira o conteúdo da embalagem, a garantia e a política de devolução.',
      duration: 9,
      visualCue: 'Lista de contras aparecendo, expressão de decepção leve',
      brollKeywords: ['cons list', 'disappointed', 'expensive'],
    },
    {
      id: 7,
      text: `Veredito: avalie se os recursos documentados de ${product.title} justificam o preço para seu uso.`,
      duration: 9,
      visualCue: 'Nota final na tela, produto ao lado de concorrentes',
      brollKeywords: ['verdict', 'rating', 'comparison'],
    },
  ];
}

function generateDefaultScript(product: ProductInfo): VideoScript {
  const scenes = generateDefaultScenes(product);
  return {
    hook: `Pare! Antes de comprar o ${product.title}, veja isso!`,
    scenes,
    totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0) + 6,
    callToAction: 'Confira o review completo e as condições atuais no link da descrição.',
  };
}

export function scriptToSubtitles(script: VideoScript): SubtitleEntry[] {
  const subtitles: SubtitleEntry[] = [];
  let currentTime = 0;

  subtitles.push({
    start: 0,
    end: 3,
    text: script.hook,
  });
  currentTime = 3;

  for (const scene of script.scenes) {
    subtitles.push({
      start: currentTime,
      end: currentTime + scene.duration,
      text: scene.text,
    });
    currentTime += scene.duration;
  }

  subtitles.push({
    start: currentTime,
    end: currentTime + 3,
    text: script.callToAction,
  });

  return subtitles;
}

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}
