import { config } from 'dotenv';

config({ path: '.env.local' });

const CANDIDATES: Array<{ provider: string; model: string }> = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' },
  { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
];

const keep: Record<string, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};

async function probe(c: { provider: string; model: string }) {
  // Isola o provider: apaga as outras chaves do processo.
  for (const [name, key] of Object.entries(keep)) {
    if (name !== c.provider) delete process.env[key];
  }

  const started = Date.now();
  try {
    const { chatCompletion } = await import('../src/lib/llm-provider');
    const out = await chatCompletion({
      systemPrompt: 'Responda apenas com JSON valido.',
      userPrompt: 'Devolva exatamente: {"ok":true}',
      temperature: 0,
      maxTokens: 60,
      model: c.model,
    });
    const ms = Date.now() - started;
    const text = String(out ?? '').slice(0, 60).replace(/\s+/g, ' ');
    console.log(`OK    ${c.provider}/${c.model} (${ms}ms): ${text}`);
    return true;
  } catch (err) {
    const ms = Date.now() - started;
    console.log(`FAIL  ${c.provider}/${c.model} (${ms}ms): ${String(err).slice(0, 110)}`);
    return false;
  }
}

async function main() {
  for (const c of CANDIDATES) {
    if (!process.env[keep[c.provider]]) {
      console.log(`SKIP  ${c.provider}: chave ausente`);
      continue;
    }
    await probe(c);
  }
}

main();
