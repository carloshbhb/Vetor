import { chatCompletion, getLLMProvider } from './llm-provider';

export interface VideoScript {
  hook: string;
  scenes: VideoScene[];
  totalDuration: number;
  callToAction: string;
  generationVersion?: 2;
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

interface ProductInfo {
  title: string;
  category: string;
  price: string;
  specifications?: Record<string, string>;
  marketplace: string;
  editorialContext?: string;
  creativeAngle?: string;
  recentHooksToAvoid?: string[];
}

function buildScriptPrompt(product: ProductInfo): string {
  const specsText = product.specifications && Object.keys(product.specifications).length
    ? Object.entries(product.specifications).map(([key, value]) => `- ${key}: ${value}`).join("\n")
    : "Nenhuma especificação estruturada foi fornecida.";
  const context = (product.editorialContext || "Não há mais dados editoriais disponíveis.")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 6500);
  const hooksToAvoid = (product.recentHooksToAvoid || []).filter(Boolean).slice(0, 12)
    .map((hook) => `- ${String(hook).slice(0, 180)}`).join("\n") || "- Nenhum roteiro anterior foi fornecido.";
  const angle = product.creativeAngle || "Escolha o ângulo mais específico para este produto e evite fórmulas comuns.";

  return `Você é roteirista e apresentador de tecnologia do Vetor.blog. Escreva em português brasileiro natural, para ser falado em voz alta por uma pessoa real.

OBJETIVO
Crie um roteiro original para YouTube Shorts/Reels de aproximadamente 60–75 segundos que ajude alguém a decidir se o produto serve para seu caso. Precisa soar como conversa clara, não como texto de catálogo ou anúncio.

PRODUTO
- Nome: ${product.title}
- Categoria: ${product.category}
- Preço informado: ${product.price}
- Marketplace: ${product.marketplace}
- Especificações fornecidas:
${specsText}

CONTEXTO EDITORIAL REAL DO REVIEW
${context}

ÂNGULO NARRATIVO OBRIGATÓRIO DESTE VÍDEO
${angle}
Esse ângulo precisa comandar a abertura, a ordem dos argumentos, os exemplos e a conclusão. Não troque apenas o nome do produto em um roteiro padrão.

ABERTURAS RECENTES A NÃO IMITAR
Não reutilize estas frases nem paráfrases superficiais:
${hooksToAvoid}

TOM DE VOZ
- Soe natural, próximo e seguro, como um bom criador de tecnologia explicando algo útil a uma pessoa.
- Varie tamanho e cadência das frases; use perguntas ou apartes apenas quando fizerem sentido.
- Prefira português brasileiro idiomático, palavras concretas e transições naturais.
- Não repita o nome completo do produto em todas as cenas nem comece todas da mesma forma.
- Evite propaganda, superlativos vazios, listas mecânicas e frases burocráticas como "está na categoria", "o preço informado é" ou "confira a versão exata" como preenchimento.
- Não diga que testou, usou, mediu ou comparou pessoalmente o produto; não invente experiência em primeira pessoa.
- Não invente características, medições, compatibilidade, autonomia, desempenho, acessórios, avaliações ou preços. Use as especificações e o contexto acima. Se faltar algo importante, apresente como dado a confirmar, sem transformar todas as cenas no mesmo aviso genérico.
- Se houver poucos fatos, faça roteiro honesto centrado no perfil de uso, decisão de compra e detalhes realmente relevantes; não preencha lacunas com clichês.

ESTRUTURA JSON OBRIGATÓRIA
{
  "hook": "abertura específica e curiosa, 6 a 14 palavras",
  "scenes": [
    {
      "id": 1,
      "text": "narração conversacional, aproximadamente 18 a 28 palavras",
      "duration": 9,
      "visualCue": "ação visual específica que combine com esta cena",
      "brollKeywords": ["termo visual concreto em inglês", "segundo termo relevante"]
    }
  ],
  "callToAction": "fechamento natural que combine com a análise e lembre onde consultar review e oferta"
}

REGRAS DE QUALIDADE
1. Crie 6 ou 7 cenas de 9–10 segundos cada; com abertura e fechamento, total de 60 a 90 segundos.
2. Cada cena deve acrescentar uma ideia nova e concreta. Não repita uma recomendação em outras palavras.
3. Crie progressão narrativa: abertura, argumento principal, detalhes relevantes, limitação/cuidado se fundamentado e conclusão útil.
4. O visualCue deve variar e descrever algo filmável; não use "produto em destaque" em todas as cenas.
5. Use brollKeywords específicas para cada cena, sem repetir termos genéricos.
6. CTA em português brasileiro, natural e específico; sem prometer desconto, estoque ou preço não confirmado.
7. Responda somente JSON válido, sem markdown ou texto adicional.`;
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
    if (typeof parsed.hook !== "string" || !parsed.hook.trim()) return false;
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length < 6 || parsed.scenes.length > 7) return false;
    if (parsed.scenes.some((scene: any) =>
      !scene || typeof scene.text !== "string" || scene.text.trim().split(/\s+/).length < 8 ||
      !Number.isFinite(scene.duration) || scene.duration < 9 || scene.duration > 10 ||
      typeof scene.visualCue !== "string" || !Array.isArray(scene.brollKeywords)
    )) return false;
    const banned = [
      /está na categoria/i,
      /o preço informado é/i,
      /antes de comprar .{0,100} confira a versão exata/i,
      /pare! antes de comprar/i,
    ];
    if (banned.some((pattern) => pattern.test([parsed.hook, ...parsed.scenes.map((scene: any) => scene.text)].join(" ")))) return false;
    return !(product.recentHooksToAvoid || []).some((hook) => hookSimilarity(parsed.hook, hook) >= 0.68);
  } catch { return false; }
}

export async function generateVideoScript(product: ProductInfo): Promise<VideoScript> {
  const prompt = buildScriptPrompt(product);
  getLLMProvider();
  const content = await chatCompletion({
    systemPrompt: "Você é roteirista editorial de tecnologia do Vetor.blog. Produza roteiro falado, natural, factual e distinto para cada produto. Responda somente JSON válido.",
    userPrompt: prompt,
    temperature: 0.82,
    maxTokens: 2200,
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
  if (
    typeof parsed.hook !== "string" || !parsed.hook.trim() ||
    scenes.length < 6 || scenes.length > 7 ||
    scenes.some((scene: unknown) => {
      if (!scene || typeof scene !== "object") return true;
      const item = scene as Partial<VideoScene>;
      return typeof item.text !== "string" || !item.text.trim() ||
        !Number.isFinite(item.duration) || (item.duration as number) < 9 || (item.duration as number) > 10 ||
        typeof item.visualCue !== "string" || !Array.isArray(item.brollKeywords);
    })
  ) throw new Error("[video-script] Roteiro reprovado: estrutura, duração ou cenas incompletas.");

  const sceneSeconds = scenes.reduce((sum: number, scene: VideoScene) => sum + scene.duration, 0);
  const computedDuration = sceneSeconds + 8;
  if (computedDuration < 60 || computedDuration > 90) throw new Error("[video-script] Duração inválida: " + computedDuration + "s.");
  const scriptText = [parsed.hook, ...scenes.map((scene: VideoScene) => scene.text), parsed.callToAction || ""].join(" ");
  if (/\b(testamos|vamos testar|vou testar|em nossos testes|nos nossos testes|medimos|rodo tudo liso|sem engasgos)\b/i.test(scriptText)) {
    throw new Error("[video-script] Roteiro reprovado: alegação de teste/experiência não fornecida.");
  }

  return {
    hook: parsed.hook.trim(),
    scenes: scenes as VideoScene[],
    totalDuration: computedDuration,
    callToAction: typeof parsed.callToAction === "string" && parsed.callToAction.trim()
      ? parsed.callToAction.trim()
      : "Veja o review completo e confira a oferta atual na descrição.",
    generationVersion: 2,
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
}

export async function generateComparisonVideoScript(input: {
  title: string;
  category: string;
  product1: { name: string };
  product2: { name: string };
  comparisonUrl: string;
}): Promise<ComparisonVideoScript> {
  if (!input.product1.name.trim() || !input.product2.name.trim()) {
    throw new Error('[comparison-video-script] Dois nomes de produtos são obrigatórios.');
  }
  const prompt = [
    'Crie um roteiro editorial para YouTube Shorts de 60 a 90 segundos comparando "' + input.product1.name + '" e "' + input.product2.name + '".',
    'Categoria: ' + input.category,
    'Título do comparativo: ' + input.title,
    'URL canônica do comparativo: ' + input.comparisonUrl,
    '',
    'DADOS CONFIRMADOS: os nomes dos produtos e a categoria acima. Não foram fornecidas fichas técnicas, medições, preços atuais nem avaliações verificadas.',
    '',
    'Retorne somente JSON:',
    '{',
    '  "hook": "abertura curta e curiosa, até 20 palavras",',
    '  "scenes": [',
    '    { "id": 1, "type": "product1", "text": "narração útil até 24 palavras", "duration": 9, "visualCue": "descrição visual neutra", "brollKeywords": ["product close up", "shopping comparison"] }',
    '  ],',
    '  "callToAction": "Veja o comparativo completo e confira os anúncios atualizados."',
    '}',
    '',
    'REGRAS:',
    '- Use 6 ou 7 cenas, cada uma com duração de 9 a 10 segundos.',
    '- Cada cena deve usar type "product1", "product2" ou "comparison".',
    '- Alterne os tipos para manter a edição visual, sem inventar medições, especificações, preços, autonomia, desempenho ou defeitos.',
    '- Não diga que testamos ou medimos os produtos; não declare vencedor, notas ou superioridade sem dados verificados.',
    '- Oriente o público a conferir fichas oficiais, compatibilidade, conteúdo da embalagem, garantia, preço total e necessidades pessoais.',
    '- Enquadre características não fornecidas como pontos a verificar, nunca como fatos.',
    '- O total renderizado inclui 3 segundos de abertura e 5 segundos de veredito/CTA, além da soma das cenas; deve ficar entre 60 e 90 segundos.',
    '- CTA sem desconto, estoque ou preço não confirmado. Use a URL canônica apenas no texto de descrição/CTA.',
    '- Não invente URLs nem citações.',
    '- Responda em português brasileiro e apenas com JSON válido.',
  ].join('\n');

  try {
    getLLMProvider();
    const response = await chatCompletion({
      systemPrompt: 'Você é roteirista editorial do Vetor.blog. Priorize precisão factual, comparação útil e JSON válido.',
      userPrompt: prompt,
      temperature: 0.35,
      maxTokens: 2200,
      responseFormat: { type: 'json_object' },
    });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Modelo não retornou JSON.');
    const parsed = JSON.parse(jsonMatch[0]);
    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    const validTypes = new Set<ComparisonSceneType>(['product1', 'product2', 'comparison']);
    if (
      typeof parsed.hook !== 'string' ||
      !parsed.hook.trim() ||
      scenes.length < 6 ||
      scenes.length > 7 ||
      scenes.some((scene: unknown) => {
        if (!scene || typeof scene !== 'object') return true;
        const item = scene as Partial<ComparisonVideoScene>;
        return typeof item.text !== 'string' ||
          !item.text.trim() ||
          !Number.isFinite(item.duration) ||
          (item.duration as number) < 9 ||
          (item.duration as number) > 10 ||
          !validTypes.has(item.type as ComparisonSceneType) ||
          !Array.isArray(item.brollKeywords);
      })
    ) {
      throw new Error('Roteiro comparativo inválido: são necessárias 6–7 cenas tipadas com 9–10 segundos cada.');
    }

    const sceneSeconds = scenes.reduce((sum: number, scene: ComparisonVideoScene) => sum + scene.duration, 0);
    const totalDuration = sceneSeconds + 8;
    if (totalDuration < 60 || totalDuration > 90) {
      throw new Error('Duração comparativa inconsistente: ' + totalDuration + 's; esperado 60–90s.');
    }
    const transcript = [parsed.hook, ...scenes.map((scene: ComparisonVideoScene) => scene.text), parsed.callToAction || ''].join(' ');
    if (/\b(testamos|em nossos testes|nos nossos testes|medimos|garantimos|vencedor|ganhador|superior|rodo tudo liso|sem engasgos)\b/i.test(transcript) ||
      /\bnota\s*(?:final)?\s*[:=]?\s*\d|\b\d(?:[.,]\d)?\/10\b/i.test(transcript)) {
      throw new Error('Roteiro comparativo reprovado: alegação ou nota sem evidência.');
    }

    return {
      hook: parsed.hook.trim(),
      scenes: scenes as ComparisonVideoScene[],
      totalDuration,
      callToAction: typeof parsed.callToAction === 'string' && parsed.callToAction.trim()
        ? parsed.callToAction.trim()
        : 'Veja o comparativo completo: ' + input.comparisonUrl + '. Confira as condições atuais dos anúncios.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error('[comparison-video-script] ' + message);
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
