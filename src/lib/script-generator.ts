import { chatCompletion, getLLMProvider } from './llm-provider';

export interface VideoScript {
  hook: string;
  scenes: VideoScene[];
  totalDuration: number;
  callToAction: string;
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
}

function buildScriptPrompt(product: ProductInfo): string {
  const specsText = product.specifications
    ? Object.entries(product.specifications)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : 'Especificações não disponíveis';

  return `Crie um roteiro de YouTube Shorts de 60 a 90 segundos sobre "${product.title}", ajudando o público a decidir se o produto atende às suas necessidades. Não use alegações sensacionalistas.

PRODUTO:
- Título: ${product.title}
- Categoria: ${product.category}
- Preço: ${product.price}
- Marketplace: ${product.marketplace}
- Especificações:
${specsText}

ESTRUTURA OBRIGATÓRIA (JSON):
{
  "hook": "Frase de impacto nos primeiros 3 segundos (máx 20 palavras)",
  "scenes": [
    {
      "id": 1,
      "text": "Narração da cena 1 (máx 30 palavras)",
      "duration": 9,
      "visualCue": "Descrição visual: ex 'Produto em close, girando 360°'",
      "brollKeywords": ["palavra-chave1", "palavra-chave2"]
    }
  ],
  "totalDuration": 60,
  "callToAction": "Confira preço e condições atuais no link da descrição."
}

REGRAS:
1. Hook deve ser irresistível: problema, curiosidade ou benefício imediato
2. 6-7 cenas no total, cada uma com 9-10 segundos
3. Texto conversacional, direto, tom de especialista
4. visualCue deve sugerir: produto em uso, detalhes, comparação, lifestyle
5. brollKeywords para buscar vídeos de estoque no Pexels (ex: "tech review", "unboxing", "smartphone close up")
6. CTA neutro: peça que a pessoa confira preço e condições no link da descrição; não prometa desconto ou estoque não confirmado.
7. Use exclusivamente informações presentes no campo Especificações. Não invente testes, uso pessoal, autonomia, desempenho, compatibilidade ou acessórios incluídos.
8. Não diga "testamos", "em nossos testes", "medimos", "rodo tudo liso" ou equivalentes; quando faltar um dado, diga que precisa ser confirmado na ficha oficial.
9. A soma das durações das cenas, mais 11 segundos de abertura, nota final e CTA, deve ser de 60 a 90 segundos.
10. Responda APENAS o JSON válido, sem texto adicional`;
}

export async function generateVideoScript(product: ProductInfo): Promise<VideoScript> {
  try {
    const prompt = buildScriptPrompt(product);
    getLLMProvider();

    const content = await chatCompletion({
      systemPrompt: 'Você é um roteirista especialista em vídeos virais de review tech para YouTube Shorts/Reels. Responda APENAS em JSON válido, sem texto adicional.',
      userPrompt: prompt,
      temperature: 0.45,
      maxTokens: 1600,
      responseFormat: { type: 'json_object' },
    });

    let parsedContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsedContent = jsonMatch[0];
    const parsed = JSON.parse(parsedContent);

    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    if (
      typeof parsed.hook !== 'string' ||
      scenes.length < 6 ||
      scenes.length > 7 ||
      scenes.some((scene: unknown) =>
        !scene || typeof scene !== 'object' ||
        typeof (scene as { text?: unknown }).text !== 'string' ||
        !(scene as { text: string }).text.trim() ||
        !Number.isFinite((scene as { duration?: number }).duration) ||
        (scene as { duration: number }).duration < 9 || (scene as { duration: number }).duration > 10
      )
    ) {
      throw new Error('Modelo retornou roteiro incompleto: são necessárias 5–7 cenas válidas.');
    }
    const sceneSeconds = scenes.reduce((sum: number, scene: VideoScene) => sum + scene.duration, 0);
    const computedDuration = sceneSeconds + 11; // 3 s de hook + 4 s de nota + 4 s de CTA
    if (computedDuration < 60 || computedDuration > 90) {
      throw new Error(`Duração inconsistente: cenas + hook/CTA totalizam ${computedDuration}s; esperado 60–90s.`);
    }
    const scriptText = [parsed.hook, ...scenes.map((scene: VideoScene) => scene.text), parsed.callToAction ?? ''].join(' ');
    if (/\b(testamos|vamos testar|vou testar|em nossos testes|nos nossos testes|medimos|rodo tudo liso|sem engasgos)\b/i.test(scriptText)) {
      throw new Error('Roteiro reprovado: contém alegação de teste ou experiência prática não fornecida.');
    }
    return {
      hook: parsed.hook,
      scenes,
      totalDuration: computedDuration,
      callToAction: typeof parsed.callToAction === 'string' && parsed.callToAction.trim()
        ? parsed.callToAction
        : 'Confira o review completo e o link de compra na descrição.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[video-script] generation failed:', message);
    throw new Error(`[video-script] generation failed: ${message}`);
  }
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
