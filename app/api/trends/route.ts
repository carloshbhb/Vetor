import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { category, type = 'reviews' } = await req.json();
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let resultText = '';
    let groundingActive = false;

    const isViral = type === 'viral';

    // 1. Try using Google Search Grounding (requires billing enabled on Google AI Studio)
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        tools: [
          {
            googleSearchRetrieval: {}
          }
        ] as any
      });

      const prompt = isViral
        ? `Você é o Agente de Tendências de SEO da vetor.blog. Pesquise na internet do Brasil em tempo real (2026) sobre pautas de TRÁFEGO VIRAL (Comparativos X vs Y, Listicles de "Melhores" e guias de compra) na categoria "${category}".
Identifique as 5 melhores ideias de artigos de tráfego que atrairiam grande audiência orgânica:
1. Comparativos diretos de produtos populares (ex: "Xiaomi Mi Band 9 vs Samsung Galaxy Fit 3").
2. Listicles de compra focados em orçamento ou custo-benefício (ex: "Top 5 Fones de Ouvido por menos de R$ 300").
3. Dúvidas quentes com alta intenção de busca (ex: "Robô aspirador realmente funciona para quem tem pet?").

Para cada pauta de tráfego, retorne em JSON estrito:
- product: Título chamativo para o artigo (ex: "Xiaomi Mi Band 9 vs Galaxy Fit 3: Qual Smartband Vale Mais a Pena?").
- keywords: Lista com as 3 ou 4 principais palavras-chave de busca associadas (ex: ["mi band 9 vs galaxy fit 3 comparativo", "diferença mi band 9 e fit 3", "qual smartband comprar 2026"]).
- difficulty: Dificuldade de ranqueamento ("Baixa", "Média", "Alta").
- volume: Volume estimado de buscas ("Baixo", "Médio", "Alto").
- cpc: Estimativa de valor comercial (ex: "R$ 1,80").
- gapAnalysis: Análise explicando o que o leitor realmente busca nessa pauta e como o nosso artigo deve fisgar o clique para direcioná-lo para os reviews específicos com link de afiliado.

Você deve responder APENAS e estritamente com um array JSON válido contendo os 5 objetos. Não adicione markdown, blocos de código com a palavra json ou explicações adicionais fora do array JSON.`
        : `Você é o Agente de Tendências de SEO da vetor.blog. Pesquise na internet do Brasil em tempo real (2026) sobre produtos em alta na categoria "${category}".
Identifique as 5 melhores oportunidades de reviews que preencham os critérios:
1. Alta intenção de compra ou forte interesse de busca atual.
2. Baixa ou média concorrência de grandes sites de mídia.

Para cada oportunidade, você deve retornar os seguintes campos estritos em formato JSON:
- product: Nome exato do produto (ex: "Samsung Galaxy Fit3").
- keywords: Lista com as 3 ou 4 principais palavras-chave de cauda longa (ex: ["Samsung Galaxy Fit3 vale a pena", "Galaxy Fit3 preço", "review Galaxy Fit3"]).
- difficulty: Dificuldade de ranqueamento, deve ser exatamente "Baixa", "Média" ou "Alta".
- volume: Volume estimado de buscas, deve ser exatamente "Baixo", "Médio" ou "Alto".
- cpc: Estimativa de custo por clique médio ou indicação de valor comercial (ex: "R$ 1,20").
- gapAnalysis: Análise breve (1 parágrafo) explicando o que os concorrentes deixaram de fora e o que o nosso review DEVE cobrir para ranquear no topo.

Você deve responder APENAS e estritamente com um array JSON válido contendo os 5 objetos. Não adicione markdown, blocos de código com a palavra json ou explicações adicionais fora do array JSON.`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      JSON.parse(cleanJson); // Validate
      resultText = cleanJson;
      groundingActive = true;
    } catch (searchError: any) {
      console.warn('Google Search Grounding failed, falling back to static Gemini knowledge graph:', searchError.message);
      
      // 2. Fallback: Request standard Gemini model without the search grounding tool
      const modelFallback = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });

      const promptFallback = isViral
        ? `Você é o Agente de Tendências de SEO da vetor.blog. Com base na sua base de conhecimentos atualizada, recomende 5 pautas de TRÁFEGO VIRAL (Comparativos, Listicles ou Guias de Compra) na categoria "${category}" que atrairiam grande público orgânico no blog.
Escolha pautas de alta busca e concorrência controlada.

Para cada pauta, você deve retornar em formato JSON estrito:
- product: Título chamativo do artigo (ex: "Xiaomi Mi Band 9 vs Galaxy Fit 3: Comparativo Completo").
- keywords: Lista com as 3 ou 4 principais palavras-chave de cauda longa associadas.
- difficulty: Dificuldade de ranqueamento ("Baixa", "Média", "Alta").
- volume: Volume estimado de buscas ("Baixo", "Médio", "Alto").
- cpc: Estimativa de valor comercial (ex: "R$ 1,80").
- gapAnalysis: Análise detalhando o que o leitor busca nessa comparação e qual o melhor gancho de conteúdo.

Você deve responder APENAS e estritamente com um array JSON válido contendo os 5 objetos. Não adicione markdown, blocos de código com a palavra json ou explicações adicionais fora do array JSON.`
        : `Você é o Agente de Tendências de SEO da vetor.blog. Com base na sua base de conhecimentos atualizada, recomende 5 produtos em alta na categoria "${category}" que seriam excelentes para escrever um review de blog hoje.
Escolha produtos que preencham os critérios:
1. Forte interesse de busca dos consumidores.
2. Baixa ou média concorrência.

Para cada produto, you must return the following strict fields in JSON format:
- product: Nome exato do produto (ex: "Samsung Galaxy Fit3").
- keywords: Lista com as 3 ou 4 principais palavras-chave de cauda longa (ex: ["Samsung Galaxy Fit3 vale a pena", "Galaxy Fit3 preço", "review Galaxy Fit3"]).
- difficulty: Dificuldade de ranqueamento, deve ser exatamente "Baixa", "Média" ou "Alta".
- volume: Volume estimado de buscas, deve ser exatamente "Baixo", "Médio" ou "Alto".
- cpc: Estimativa de custo por clique médio ou indicação de valor comercial (ex: "R$ 1,20").
- gapAnalysis: Análise breve (1 parágrafo) explicando o que os concorrentes costumam esquecer nos reviews comuns e o que o nosso review DEVE cobrir para ranquear no topo.

Você deve responder APENAS e estritamente com um array JSON válido contendo os 5 objetos. Não adicione markdown, blocos de código com a palavra json ou explicações adicionais fora do array JSON.`;

      const response = await modelFallback.generateContent(promptFallback);
      const text = response.response.text();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      JSON.parse(cleanJson); // Validate
      resultText = cleanJson;
      groundingActive = false;
    }

    return NextResponse.json({
      trends: JSON.parse(resultText),
      groundingActive
    });
  } catch (error: any) {
    console.error('Error in Trends API:', error);
    return NextResponse.json({ error: 'Erro ao processar tendências com a IA: ' + error.message }, { status: 500 });
  }
}
