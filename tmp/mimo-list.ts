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

async function main() {
  const key = process.env.MIMO_API_KEY || mimoKeyFromConfig();
  const baseURL = process.env.MIMO_BASE_URL || 'https://opengateway.gitlawb.com/v1';
  if (!key) {
    console.log('chave mimo ausente');
    return;
  }
  const res = await fetch(`${baseURL}/models`, { headers: { Authorization: `Bearer ${key}` } });
  console.log('status', res.status);
  if (!res.ok) {
    console.log((await res.text()).slice(0, 400));
    return;
  }
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  const ids = (data.data || []).map((m) => m.id);
  console.log('modelos:', ids.length);
  for (const id of ids) console.log('-', id);
}

main().catch((e) => console.log('ERRO', String(e).slice(0, 300)));
