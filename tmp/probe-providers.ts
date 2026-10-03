import { config } from 'dotenv';

config({ path: '.env.local' });

const KEY_MAP: Record<string, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};

const only = process.argv[2];
const targets = only ? [only] : Object.keys(KEY_MAP);

async function probe(provider: string, name: string) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const { chatCompletion } = await import('../src/lib/llm-provider');
    const out = await chatCompletion({
      systemPrompt: 'Responda apenas com JSON valido.',
      userPrompt: 'Devolva exatamente: {"ok":true}',
      temperature: 0,
      maxTokens: 60,
      signal: controller.signal,
    } as never);
    const ms = Date.now() - started;
    clearTimeout(timer);
    const text = String(out ?? '').slice(0, 80).replace(/\s+/g, ' ');
    console.log(`OK    ${provider} (${ms}ms): ${text}`);
  } catch (err) {
    const ms = Date.now() - started;
    clearTimeout(timer);
    console.log(`FAIL  ${provider} (${ms}ms): ${String(err).slice(0, 120)}`);
  }
}

async function main() {
  for (const provider of targets) {
    const name = KEY_MAP[provider];
    if (!name) {
      console.log(`SKIP  ${provider}: chave nao mapeada`);
      continue;
    }
    if (!process.env[name]) {
      console.log(`SKIP  ${provider}: ${name} ausente`);
      continue;
    }
    await probe(provider, name);
  }
}

main();
