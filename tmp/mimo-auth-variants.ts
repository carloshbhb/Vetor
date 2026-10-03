import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cfg = path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc');
const m = fs.readFileSync(cfg, 'utf8').match(/"mimo"\s*:\s*\{[\s\S]*?"apiKey"\s*:\s*"([^"]+)"/);
const key = m![1];
const baseURL = 'https://opengateway.gitlawb.com/v1';

async function probe(label: string, headers: Record<string, string>) {
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2.5-pro',
        max_tokens: 30,
        messages: [{ role: 'user', content: 'Say OK' }],
      }),
    });
    let body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch {}
    console.log(`${label} → ${res.status}: ${body.replace(/\n/g, ' ')}`);
  } catch (e) {
    console.log(`${label} → ERR ${String(e).slice(0, 120)}`);
  }
}

async function main() {
  await probe('Bearer', { Authorization: `Bearer ${key}` });
  await probe('raw-key', { Authorization: key });
  await probe('X-API-Key', { 'X-API-Key': key });
  await probe('no-auth', {});
}
main();
