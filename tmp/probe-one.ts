import { config } from 'dotenv';

config({ path: '.env.local' });

const provider = process.argv[2];
const model = process.argv[3];

const keep: Record<string, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};

async function main() {
  if (!keep[provider]) {
    console.log(`provider desconhecido: ${provider}`);
    return;
  }
  for (const [name, key] of Object.entries(keep)) {
    if (name !== provider) delete process.env[key];
  }
  if (!process.env[keep[provider]]) {
    console.log(`SKIP ${provider}: chave ausente`);
    return;
  }
  const t0 = Date.now();
  try {
    const { chatCompletion } = await import('../src/lib/llm-provider');
    const out = await chatCompletion({
      systemPrompt: 'Responda apenas com JSON valido.',
      userPrompt: 'Devolva exatamente: {"ok":true}',
      temperature: 0,
      maxTokens: 60,
      ...(model ? { model } : {}),
    });
    console.log(`OK ${provider}/${model || 'default'} (${Date.now() - t0}ms): ${String(out ?? '').slice(0, 80)}`);
  } catch (e) {
    console.log(`FAIL ${provider}/${model || 'default'} (${Date.now() - t0}ms): ${String(e).slice(0, 150)}`);
  }
}

main();
