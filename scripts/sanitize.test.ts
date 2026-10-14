import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/lib/sanitize';

const sanitized = sanitizeHtml(
  '<p style="position:fixed;inset:0;background:url(javascript:alert(1))" onclick="alert(1)">Safe <strong>text</strong></p>' +
  '<a href="javascript:alert(1)">unsafe link</a>'
);

assert.equal(/\bstyle\s*=|\bonclick\s*=/i.test(sanitized), false, 'inline styles and event handlers must be removed');
assert.equal(/href\s*=\s*["']?javascript:/i.test(sanitized), false, 'javascript URLs must be removed');
assert.match(sanitized, /<strong>text<\/strong>/, 'safe editorial markup should be preserved');

console.log('Editorial HTML sanitization tests passed');
