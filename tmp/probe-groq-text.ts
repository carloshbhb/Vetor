import { config } from 'dotenv';

config({ path: '.env.local' });

// Força groq e limpa as outras chaves.
delete process.env.OPENROUTER_API_KEY;
delete process.env.GOOGLE_AI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.NVIDIA_API_KEY;
process.env.GROQ_MODEL = process.argv[2] || 'openai/gpt-oss-120b';

const prompts = [
  'Responda apenas com {"ok":true}',
  'Diga oi em uma frase.',
  'Liste 3 cores em JSON {"cores":["a","b","c"]}',
];

async function main() {
  const { chatCompletion } = await import('../src/lib/llm-provider');
  for (const p of prompts) {
    const started = Date.now();
    try {
      const out = await chatCompletion({
        systemPrompt: 'Responda apenas com JSON valido, nada mais.',
        userPrompt: p,
        temperature: 0,
        maxTokens: 200,
      });
      const ms = Date.now() - started;
      const text = String(out ?? '').slice(0, 120).replace(/\s+/g, ' ');
      console.log(`OK (${ms}ms, ${String(out ?? '').length} chars): ${text}`);
    } catch (err) {
      const ms = Date.now() - started;
      console.log(`FAIL (${ms}ms): ${String(err).slice(0, 140)}`);
    }
  }
}

main();