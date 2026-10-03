import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

delete process.env.OPENROUTER_API_KEY;
delete process.env.GOOGLE_AI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.NVIDIA_API_KEY;
process.env.GROQ_MODEL = 'openai/gpt-oss-120b';

async function main() {
  const { chatCompletion } = await import('../src/lib/llm-provider');

  const data = JSON.parse(readFileSync('tmp/rewrite-slices/slice-1.json', 'utf8'));
  const review = Array.isArray(data)
    ? data.find((r) => r.slug === 'robo-aspirador-eufy-g10-hybrid') || data[0]
    : data.reviews.find((r) => r.slug === 'robo-aspirador-eufy-g10-hybrid');
  const ctx = [
    `Produto: ${review.product}`,
    `Categoria: ${review.category}`,
    `Veredicto: ${review.verdict_label || ''} — ${review.verdict_text || ''}`.trim(),
    `Prós: ${(review.pros || []).join(' | ')}`,
    `Contras: ${(review.cons || []).join(' | ')}`,
  ].join('\n');
  const userPrompt = `${ctx}\n\nSeções para reescrever:\n${JSON.stringify(
    (review.sections || []).map((s) => ({ id: s.id, heading: s.heading, content: s.content })),
    null,
    1
  )}`;

  const maxTokens = Number(process.argv[2]) || 6000;
  const started = Date.now();
  try {
    const out = await chatCompletion({
      systemPrompt: 'Responda apenas com JSON valido {"sections":[{"id":"...","content":"..."}]}',
      userPrompt,
      temperature: 0.5,
      maxTokens,
    });
    const ms = Date.now() - started;
    console.log(`OK groq (${ms}ms, ${String(out ?? '').length} chars, maxTokens=${maxTokens})`);
    console.log(String(out ?? '').slice(0, 300));
  } catch (err) {
    const ms = Date.now() - started;
    console.log(`FAIL groq (${ms}ms, maxTokens=${maxTokens}): ${String(err).slice(0, 200)}`);
  }
}

main();