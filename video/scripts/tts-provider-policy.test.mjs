import assert from 'node:assert/strict';
import { shouldUsePaidElevenLabsFallback } from './tts-provider-policy.mjs';

assert.equal(shouldUsePaidElevenLabsFallback({ apiKey: 'configured', allowPaidFallback: false }), false);
assert.equal(shouldUsePaidElevenLabsFallback({ apiKey: 'configured', allowPaidFallback: true }), true);
assert.equal(shouldUsePaidElevenLabsFallback({ apiKey: '', allowPaidFallback: true }), false);
assert.equal(shouldUsePaidElevenLabsFallback({ apiKey: '   ', allowPaidFallback: true }), false);
assert.equal(shouldUsePaidElevenLabsFallback({ apiKey: 'configured', allowPaidFallback: 'true' }), false);

console.log('TTS provider policy tests passed.');
