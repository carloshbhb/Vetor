import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// Paleta de referência (templates em ~/Desktop/site): dark navy + amarelo.
const REQUIRED_TOKENS = {
  '--bg': '#071018',
  '--bg-2': '#0d1722',
  '--surface': '#ffffff',
  '--surface-2': '#f5f7f9',
  '--text': '#101722',
  '--muted': '#637082',
  '--line': '#dfe5eb',
  '--brand': '#ffe600',
  '--brand-2': '#f6ce00',
  '--green': '#11b86a',
  '--red': '#e84b4b',
  '--dark': '#0c1118',
  '--radius': '22px',
  '--max': '1180px',
};

test('tokens.css contém a paleta v2 da referência', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles', 'tokens.css'), 'utf8').toLowerCase();
  for (const [token, value] of Object.entries(REQUIRED_TOKENS)) {
    assert.match(css, new RegExp(`${token}:\\s*${value.replace('#', '\\#')}`), `token ${token} deve ser ${value}`);
  }
});
