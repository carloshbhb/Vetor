import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeImageSrc, formatScoreBR, IMAGE_PLACEHOLDER } from '../src/lib/images';

test('safeImageSrc aceita hosts allowlist e cai no placeholder', () => {
  assert.equal(
    safeImageSrc('https://http2.mlstatic.com/D_NQ_NP_x.webp'),
    'https://http2.mlstatic.com/D_NQ_NP_x.webp'
  );
  assert.equal(
    safeImageSrc('https://www.vetor.blog/assets/img/x.jpg'),
    'https://www.vetor.blog/assets/img/x.jpg'
  );
  assert.equal(safeImageSrc('https://m.media-amazon.com/x.jpg'), IMAGE_PLACEHOLDER);
  assert.equal(safeImageSrc('javascript:alert(1)'), IMAGE_PLACEHOLDER);
  assert.equal(safeImageSrc(null), IMAGE_PLACEHOLDER);
  assert.equal(safeImageSrc(''), IMAGE_PLACEHOLDER);
});

test('formatScoreBR formata pt-BR e rejeita inválidos', () => {
  assert.equal(formatScoreBR(8.7), '8,7');
  assert.equal(formatScoreBR(8), '8,0');
  assert.equal(formatScoreBR(null), null);
  assert.equal(formatScoreBR(undefined), null);
  assert.equal(formatScoreBR(NaN), null);
  assert.equal(formatScoreBR(0), null);
});
