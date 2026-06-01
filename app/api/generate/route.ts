import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildPrompt } from '@/lib/prompt';
import type { GenerateInput } from '@/lib/prompt';
import { getAllReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── SEO Checks (mirrors ReviewForm.tsx logic) ───────────────────────────────
interface SEACheckResult {
  failedChecks: string[];
  allPassed: boolean;
}

function runSeoChecks(data: any): SEACheckResult {
  const failedChecks: string[] = [];

  // SEO checks
  const title = data.meta?.title || '';
  if (title.length < 40 || title.length > 60) {
    failedChecks.push(`Título SEO deve ter 40-60 caracteres (atual: ${title.length})`);
  }

  const desc = data.meta?.description || '';
  if (desc.length < 130 || desc.length > 165) {
    failedChecks.push(`Descrição deve ter 130-165 caracteres (atual: ${desc.length})`);
  }

  const keywords = (data.meta?.keywords || '').split(',').filter((k: string) => k.trim());
  if (keywords.length < 3) {
    failedChecks.push(`Mínimo 3 palavras-chave (atual: ${keywords.length})`);
  }

  const wordCount = (data.sections || []).reduce((acc: number, s: any) => {
    return acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  if (wordCount < 800) {
    failedChecks.push(`Conteúdo deve ter mais de 800 palavras (atual: ${wordCount})`);
  }

  if (!data.faq || data.faq.length < 4) {
    failedChecks.push(`Mínimo 4 perguntas FAQ (atual: ${data.faq?.length || 0})`);
  }

  // CRO checks
  if (!data.specs || data.specs.length < 5) {
    failedChecks.push(`Mínimo 5 especificações (atual: ${data.specs?.length || 0})`);
  }

  if (!data.pros || data.pros.length < 4 || !data.cons || data.cons.length < 3) {
    failedChecks.push(`Prós (mín 4) e Contras (mín 3) incompletos`);
  }

  if (!data.compare?.rows || data.compare.rows.length < 2) {
    failedChecks.push(`Mínimo 2 linhas na tabela comparativa (atual: ${data.compare?.rows?.length || 0})`);
  }

  if (!data.verdict?.score || !data.verdict?.text) {
    failedChecks.push(`Veredicto com nota e texto obrigatórios`);
  }

  return { failedChecks, allPassed: failedChecks.length === 0 };
}

// ─── OpenRouter refinement pass ──────────────────────────────────────────────
async function refineWithOpenRouter(data: any, failedChecks: string[]): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[Generate] OPENROUTER_API_KEY not set, skipping refinement');
    return data;
  }

  const refinementPrompt = `Você é um especialista em SEO e copywriting. O review abaixo foi gerado por IA, mas NÃO passou em todas as verificações de qualidade SEO.

DADOS ATUAIS DO REVIEW:
${JSON.stringify(data, null, 2)}

VERIFICAÇÕES QUE FALHARAM:
${failedChecks.map((c, i) => `${i + 1}. ${c}`).join('\n')}

SUA TAREFA:
Corrija APENAS os campos que falharam. Para cada correção:
1. Se o título está fora do tamanho, reescreva com 40-60 caracteres com a palavra-chave principal
2. Se a descrição está fora, reescreva com 130-165 caracteres com CTA
3. Se faltam palavras-chave, adicione até ter 5-8 relevantes
4. Se o conteúdo tem menos de 800 palavras, EXPANDA as seções existentes com mais detalhes práticos, exemplos de uso e comparações (não crie seções novas, expanda as existentes)
5. Se faltam FAQs, adicione até ter 5+ perguntas relevantes
6. Se faltam specs, adicione até ter 5+ especificações reais
7. Se prós/contras estão incompletos, complete até ter 4+ prós e 3+ contras
8. Se a tabela comparativa está vazia, adicione 2+ linhas de comparação
9. Se o veredicto está vazio, crie um veredicto com nota, label e texto

REGRAS:
- NÃO altere campos que JÁ passaram nas verificações
- Mantenha o mesmo estilo e tom do review original
- O JSON de retorno deve ter EXATAMENTE a mesma estrutura do input
- Retorne APENAS o JSON corrigido, sem texto explicativo

JSON CORRIGIDO:`;

  const models = [
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
    { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B' },
  ];

  for (const m of models) {
    try {
      console.log(`[Generate] Refining with ${m.name}...`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vetor.blog',
        'X-Title': 'Vetor Blog',
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: m.id,
          messages: [{ role: 'user', content: refinementPrompt }],
          temperature: 0.5,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Generate] ${m.name} failed (${response.status}): ${errText}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) continue;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const refined = JSON.parse(jsonMatch[0]);
      console.log(`[Generate] ${m.name} refinement succeeded`);
      return refined;
    } catch (err: any) {
      console.warn(`[Generate] ${m.name} error:`, err.message);
      continue;
    }
  }

  console.warn('[Generate] All refinement models failed, returning original data');
  return data;
}

export async function POST(req: Request) {
   try {
     const body = await req.json() as GenerateInput;

     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) {
       return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
     }

     const genAI = new GoogleGenerativeAI(apiKey);
     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

     // Retrieve unique list of existing categories in the database
     const reviews = await getAllReviews();
     const existingCategories = Array.from(new Set(reviews.map(r => r.category).filter(Boolean)));

     const prompt = buildPrompt({
       ...body,
       existingCategories,
     });

     // ── Pass 1: Gemini generates the full review ──────────────────────────
     console.log('[Generate] Pass 1: Gemini generating review...');
     const result = await model.generateContent({
       contents: [{ role: 'user', parts: [{ text: prompt }] }],
       generationConfig: { 
         maxOutputTokens: 8192,
         temperature: 0.7,
       },
     });

     const responseText = result.response.text();
     if (!responseText) throw new Error('Empty AI response');

     const jsonMatch = responseText.match(/\{[\s\S]*\}/);
     if (!jsonMatch) throw new Error('Could not parse JSON from AI response');

     let reviewJson = JSON.parse(jsonMatch[0]);

     // ── SEO Quality Check ─────────────────────────────────────────────────
     const { failedChecks, allPassed } = runSeoChecks(reviewJson);
     console.log(`[Generate] SEO checks: ${allPassed ? 'ALL PASSED' : `${failedChecks.length} FAILED`}`);

     // ── Pass 2: OpenRouter refines failing checks ─────────────────────────
     if (!allPassed) {
       console.log('[Generate] Pass 2: OpenRouter refining SEO issues...');
       reviewJson = await refineWithOpenRouter(reviewJson, failedChecks);

       // Re-check after refinement
       const { failedChecks: recheckFailed, allPassed: recheckPassed } = runSeoChecks(reviewJson);
       if (!recheckPassed) {
         console.warn(`[Generate] Still ${recheckFailed.length} checks failing after refinement:`, recheckFailed);
       } else {
         console.log('[Generate] All SEO checks now pass after refinement!');
       }
     }

     return NextResponse.json({ 
       success: true, 
       data: reviewJson,
       seo: { 
         passed: allPassed, 
         failedChecks: allPassed ? [] : failedChecks 
       }
     });
   } catch (error: any) {
     console.error('Generate error:', error);
     return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
   }
 }
