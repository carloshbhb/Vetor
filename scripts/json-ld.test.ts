import assert from 'node:assert/strict';
import { serializeJsonLd } from '../src/lib/seo';

const payload = {
  name: '</script><script>alert("xss")</script>',
  description: 'Unicode separators: \u2028 and \u2029',
};

const serialized = serializeJsonLd(payload);

assert.equal(serialized.toLowerCase().includes('</script>'), false, 'serialized JSON-LD must not close its HTML script element');
assert.ok(serialized.includes('\\u003c/script>'), 'less-than signs must be escaped for HTML script context');
assert.deepEqual(JSON.parse(serialized), payload, 'escaping must preserve the original structured data');

console.log('JSON-LD serialization security tests passed');
