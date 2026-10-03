import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function mask(v: unknown): string {
  if (typeof v !== 'string') return `${typeof v}`;
  if (v.length <= 12) return `${v.slice(0, 4)}…(len=${v.length})`;
  return `${v.slice(0, 8)}…${v.slice(-4)} (len=${v.length})`;
}

function walk(obj: unknown, prefix = ''): void {
  if (obj === null || typeof obj !== 'object') {
    console.log(`${prefix} = ${mask(obj)}`);
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    walk(v, prefix ? `${prefix}.${k}` : k);
  }
}

// 1) chave no config
const cfg = path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc');
const raw = fs.readFileSync(cfg, 'utf8');
const m = raw.match(/"mimo"\s*:\s*\{[\s\S]*?"apiKey"\s*:\s*"([^"]+)"/);
console.log('config mimo key:', m ? mask(m[1]) : 'NAO ENCONTRADA');

// 2) auth.json
const authPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
if (fs.existsSync(authPath)) {
  console.log('== auth.json ==');
  walk(JSON.parse(fs.readFileSync(authPath, 'utf8')));
}

// 3) confirmar /models com a chave extraída
async function main() {
  if (!m) return;
  const res = await fetch('https://opengateway.gitlawb.com/v1/models', {
    headers: { Authorization: `Bearer ${m[1]}` },
  });
  console.log('/models com Bearer →', res.status);
  const res2 = await fetch('https://opengateway.gitlawb.com/v1/models');
  console.log('/models sem auth →', res2.status);
}
main();
