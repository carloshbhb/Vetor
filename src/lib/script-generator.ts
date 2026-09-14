import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'sk-fallback-key',
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

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

  return `Crie um roteiro de vídeo curto (60-90 segundos) para o produto "${product.title}" focado em conversão para YouTube Shorts/Reels/TikTok.

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
      "duration": 5,
      "visualCue": "Descrição visual: ex 'Produto em close, girando 360°'",
      "brollKeywords": ["palavra-chave1", "palavra-chave2"]
    }
  ],
  "totalDuration": 60,
  "callToAction": "Link na bio/Descrição para comprar com desconto!"
}

REGRAS:
1. Hook deve ser irresistível: problema, curiosidade ou benefício imediato
2. 5-7 cenas no total, cada uma com 5-10 segundos
3. Texto conversacional, direto, tom de especialista
4. visualCue deve sugerir: produto em uso, detalhes, comparação, lifestyle
5. brollKeywords para buscar vídeos de estoque no Pexels (ex: "tech review", "unboxing", "smartphone close up")
6. callToAction direto para link de afiliado
7. Total entre 60-90 segundos
8. Responda APENAS o JSON válido, sem texto adicional`;
}

export async function generateVideoScript(product: ProductInfo): Promise<VideoScript> {
  try {
    const prompt = buildScriptPrompt(product);

    const response = await openai.chat.completions.create({
      model: process.env.GROQ_API_KEY ? 'llama-3.1-70b-versatile' : 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um roteirista especialista em vídeos virais de review tech para YouTube Shorts/Reels. Responda APENAS em JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return {
      hook: parsed.hook || `Conheça o ${product.title} - vale a pena?`,
      scenes: parsed.scenes || generateDefaultScenes(product),
      totalDuration: parsed.totalDuration || 60,
      callToAction: parsed.callToAction || 'Link na descrição para comprar com desconto!',
    };
  } catch (error) {
    console.error('Error generating script:', error);
    return generateDefaultScript(product);
  }
}

function generateDefaultScenes(product: ProductInfo): VideoScene[] {
  return [
    {
      id: 1,
      text: `Chegou o ${product.title}, será que vale o investimento?`,
      duration: 5,
      visualCue: 'Produto em destaque com zoom dramático',
      brollKeywords: ['product reveal', 'tech unboxing'],
    },
    {
      id: 2,
      text: `Pelo preço de ${product.price}, ele promete muito. Vamos testar.`,
      duration: 7,
      visualCue: 'Preço aparecendo na tela, transição para produto em mãos',
      brollKeywords: ['price tag', 'money', 'shopping'],
    },
    {
      id: 3,
      text: 'Design premium, construção sólida. Na mão passa confiança.',
      duration: 8,
      visualCue: 'Close nos detalhes, materiais, acabamento',
      brollKeywords: ['product close up', 'premium design', 'hands on'],
    },
    {
      id: 4,
      text: 'Desempenho surpreendeu. Rodo tudo liso, sem engasgos.',
      duration: 8,
      visualCue: 'Produto em uso real: apps, jogos, multitarefa',
      brollKeywords: ['performance test', 'gaming', 'multitasking'],
    },
    {
      id: 5,
      text: 'Bateria aguenta o dia todo tranquilo. Carregamento rápido.',
      duration: 7,
      visualCue: 'Ícone de bateria, carregador, uso contínuo',
      brollKeywords: ['battery life', 'charging', 'all day'],
    },
    {
      id: 6,
      text: 'Pontos fracos: preço alto e sem carregador na caixa.',
      duration: 7,
      visualCue: 'Lista de contras aparecendo, expressão de decepção leve',
      brollKeywords: ['cons list', 'disappointed', 'expensive'],
    },
    {
      id: 7,
      text: `Veredicto: ${product.title} é top, mas só compre se precisar do melhor.`,
      duration: 8,
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
    totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
    callToAction: 'Link na descrição para comprar com desconto!',
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