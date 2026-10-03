import * as fs from 'fs';
import * as path from 'path';
import { validate } from '../scripts/rewrite-review-sections';

const slicesDir = path.join(__dirname, 'rewrite-slices');
let eufy: { slug: string; sections: Array<{ id: string; content: string }> } | null = null;
for (const f of fs.readdirSync(slicesDir)) {
  if (!/^slice-\d+\.json$/.test(f)) continue;
  const arr = JSON.parse(fs.readFileSync(path.join(slicesDir, f), 'utf8'));
  const hit = arr.find((r: { slug: string }) => r.slug === 'robo-aspirador-eufy-g10-hybrid');
  if (hit) { eufy = hit; break; }
}
if (!eufy) throw new Error('eufy não achado');
const gemini = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'rewrite-dryrun', 'robo-aspirador-eufy-g10-hybrid.json'), 'utf8')
);

// Caso 1: injeta frase inventada com specs de outra seção.
const bad1 = JSON.parse(JSON.stringify(gemini.sections));
bad1[0].content += ' A Samsung Galaxy Fit traz Snapdragon 450 com 2GB de RAM e roda com mais folga.';
const v1 = validate(eufy.sections, bad1);
console.log(v1.ok ? 'FALHA DO GATE (aceitou invenção!)' : 'GATE OK (rejeitou invenção)');
for (const e of v1.errors) console.log('  -', e);

// Caso 2: apaga uma spec real (130 ml do mop).
const bad2 = JSON.parse(JSON.stringify(gemini.sections));
const mop = bad2.find((s: { id: string }) => /mop/i.test(s.id));
if (mop) mop.content = mop.content.replace(/130\s?ml?/gi, '').replace(/reservatório de água[^.]*\./gi, '');
const v2 = validate(eufy.sections, bad2);
console.log(v2.ok ? 'FALHA DO GATE (aceitou remoção de spec!)' : 'GATE OK (rejeitou remoção)');
for (const e of v2.errors) console.log('  -', e);
