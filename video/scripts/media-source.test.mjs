import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vertical = readFileSync('src/compositions/EditorialReview.tsx', 'utf8');
const landscape = readFileSync('src/compositions/EditorialReviewLandscape.tsx', 'utf8');
for (const [name, source] of [['portrait', vertical], ['landscape', landscape]]) {
  assert.ok(source.includes('resolveMediaSource(src)'), name + ' product images use Remotion public paths');
  assert.ok(source.includes('resolveMediaSource(props.audioUrl)'), name + ' audio uses Remotion public paths');
  assert.ok(source.includes('resolveMediaSource(brollUrl)'), name + ' B-roll uses Remotion public paths');
}
console.log('Remotion media-source contract: all assertions passed');
