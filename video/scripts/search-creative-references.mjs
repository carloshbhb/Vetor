#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const catalogPath = path.join(root, 'reference-library/awesome-opus5-5-videos/videos.json');
const casesPath = path.join(root, 'reference-library/opus-video-prompts/cases-index.json');
const terms = process.argv.slice(2).join(' ').toLowerCase().trim();
if (!terms) {
  console.log('Uso: npm run references:search -- <termos>');
  console.log('Ex.: npm run references:search -- product motion graphics threejs');
  process.exit(0);
}
const tokens = terms.split(/\s+/).filter(Boolean);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const caseIndex = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const score = (item) => {
  const haystack = [item.slug, item.author, item.category, ...(item.tech_tags || []), item.prompt, item.title, item.method]
    .filter(Boolean).join(' ').toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
};
const results = [
  ...catalog.map((item) => ({...item, source: 'awesome-opus5-5-videos', score: score(item)})),
  ...caseIndex.cases.map((item) => ({...item, source: 'opus-video-prompts (metadata)', score: score(item)})),
].filter((item) => item.score > 0).sort((a,b) => b.score-a.score).slice(0,20);
if (!results.length) {
  console.log('Nenhuma referência encontrada. Tente termos mais amplos.');
  process.exit(0);
}
for (const [index,item] of results.entries()) {
  const url = item.post_url || item.sourceUrl || item.skillry_url || 'https://github.com/yihui-dev/awesome-opus5-5-videos';
  console.log('\n' + (index+1) + '. ' + (item.title || item.slug) + ' — ' + (item.author || 'autor não informado'));
  console.log('   Categoria: ' + (item.category || 'n/a') + ' | Técnicas: ' + (item.tech_tags || []).join(', '));
  console.log('   Fonte: ' + item.source + ' | ' + url);
  if (item.prompt) console.log('   Prompt: ' + item.prompt.replace(/\s+/g,' ').slice(0,420) + (item.prompt.length>420?'…':''));
  else if (item.method) console.log('   Método: ' + item.method);
}
