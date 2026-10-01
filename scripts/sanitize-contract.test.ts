import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/lib/sanitize';

test('remove href javascript: mesmo dentro de tag não permitida (unwrap)', () => {
  const out = sanitizeHtml('<foo><a href="javascript:alert(1)">x</a></foo>');
  assert.ok(!out.includes('javascript:'), out);
  assert.ok(out.includes('>x<'), out);
});

test('allowlist de protocolos em href/src', () => {
  assert.ok(!sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>').includes('vbscript:'));
  assert.ok(!sanitizeHtml('<a href="java\tscript:alert(1)">x</a>').includes('script:'));
  const ok = sanitizeHtml('<a href="https://loja.com/x">x</a>');
  assert.ok(ok.includes('https://loja.com/x'), ok);
  const rel = sanitizeHtml('<a href="/reviews/x">x</a>');
  assert.ok(rel.includes('/reviews/x'), rel);
});
