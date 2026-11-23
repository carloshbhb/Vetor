import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opus = JSON.parse(fs.readFileSync(path.join(root, 'reference-library/awesome-opus5-5-videos/videos.json'), 'utf8'));
const cases = JSON.parse(fs.readFileSync(path.join(root, 'reference-library/opus-video-prompts/cases-index.json'), 'utf8'));
assert.equal(opus.length, 703, 'Expected all 703 upstream prompt records');
assert.equal(cases.cases.length, 54, 'Expected all 54 public case metadata records');
assert.ok(opus.every((item) => item.slug && item.category && Array.isArray(item.tech_tags)), 'Every prompt needs stable catalog metadata');
assert.ok(cases.cases.every((item) => item.title && item.author && item.sourceUrl), 'Every case needs attribution and source URL');
assert.ok(fs.existsSync(path.join(root, 'reference-library/awesome-opus5-5-videos/LICENSE')), 'Upstream MIT license must be retained');
console.log('Creative reference catalog OK: ' + opus.length + ' prompts + ' + cases.cases.length + ' attributed case records.');
