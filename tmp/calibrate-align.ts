import * as fs from 'fs';
import * as path from 'path';
import { alignmentIssues, trigramJaccard, splitSentences } from '../scripts/rewrite-review-sections';

const slicesDir = path.join(__dirname, 'rewrite-slices');
let eufy: { slug: string; sections: Array<{ id: string; content: string }> } | null = null;
for (const f of fs.readdirSync(slicesDir)) {
  if (!/^slice-\d+\.json$/.test(f)) continue;
  const arr = JSON.parse(fs.readFileSync(path.join(slicesDir, f), 'utf8'));
  const hit = arr.find((r: { slug: string }) => r.slug === 'robo-aspirador-eufy-g10-hybrid');
  if (hit) { eufy = hit; break; }
}
if (!eufy) throw new Error('eufy não achado nos slices');
const gemini = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'rewrite-dryrun', 'robo-aspirador-eufy-g10-hybrid.json'), 'utf8')
);
let worst = 1;
for (const sec of eufy.sections) {
  const rw = gemini.sections.find((s: { id: string }) => s.id === sec.id);
  if (!rw) continue;
  for (const o of splitSentences(rw.content)) {
    let best = 0;
    for (const s of splitSentences(sec.content)) best = Math.max(best, trigramJaccard(o, s));
    if (best < worst) worst = best;
  }
  const issues = alignmentIssues(sec.content, rw.content);
  console.log(`${issues.length === 0 ? 'PASS' : 'FAIL'} ${sec.id} (pior J saída=${worst.toFixed(2)})${issues.length ? `: ${issues[0]}` : ''}`);
}

// Caso ruim sintético: frase inventada colada numa seção real.
const bad = eufy.sections[0].content + ' A Samsung Galaxy Fit traz Snapdragon 450 com 2GB de RAM e roda com mais folga.';
console.log('--- caso ruim ---');
for (const issue of alignmentIssues(eufy.sections[0].content, bad)) {
  console.log('FLAG:', issue);
}
