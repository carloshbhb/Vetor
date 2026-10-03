import { config } from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

config({ path: '.env.local' });

function mimoKeyFromConfig(): string | null {
  const cfg = path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc');
  try {
    const raw = fs.readFileSync(cfg, 'utf8');
    const m = raw.match(/"mimo"\s*:\s*\{[\s\S]*?"apiKey"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function probe(baseURL: string, key: string, model: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: 'system', content: 'Responda apenas com JSON valido.' },
          { role: 'user', content: 'Devolva exatamente: {"ok":true}' },
        ],
      }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      console.log(`FAIL ${model} (${ms}ms): ${res.status} ${(await res.text()).slice(0, 150)}`);
      return;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? '';
    console.log(`OK ${model} (${ms}ms): ${text.slice(0, 80).replace(/\n/g, '\\n')}`);
  } catch (e) {
    console.log(`ERR ${model} (${Date.now() - t0}ms): ${String(e).slice(0, 150)}`);
  }
}

async function main() {
  const key = process.env.MIMO_API_KEY || mimoKeyFromConfig();
  const baseURL = process.env.MIMO_BASE_URL || 'https://opengateway.gitlawb.com/v1';
  if (!key) {
    console.log('chave mimo ausente');
    return;
  }
  for (const model of [
    'mimo-v2.6-flash',
    'xiaomi/mimo-v2.6-flash',
    'xiaomi/mimo-v2.5',
    'xiaomi/mimo-v2.5-pro',
    'inclusionai/ling-3.0-flash',
    'google/gemini-3.1-flash-lite',
  ]) {
    await probe(baseURL, key, model);
  }
}

main();
