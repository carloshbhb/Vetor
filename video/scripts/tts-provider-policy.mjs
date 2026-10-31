export function shouldUsePaidElevenLabsFallback({ apiKey, allowPaidFallback }) {
  return Boolean(typeof apiKey === 'string' && apiKey.trim()) && allowPaidFallback === true;
}
