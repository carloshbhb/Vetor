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

const v = validate(eufy.sections, gemini.sections);
console.log(v.ok ? 'VALIDATE PASS (gemini bom)' : 'VALIDATE FAIL (falso-positivo!)');
for (const e of v.errors) console.log('  -', e);
