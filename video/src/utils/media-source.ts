import { staticFile } from 'remotion';

/**
 * Resolve local public assets through Remotion's publicDir-aware URL builder.
 * Remote sources remain untouched; local paths may be passed as "/assets/x"
 * from compositions or "tmp/x" from the production worker.
 */
export function resolveMediaSource(source: string): string {
  const value = String(source || '').trim();
  if (!value) throw new Error('Remotion media source is empty.');
  if (/^(https?:|data:)/i.test(value)) return value;
  return staticFile(value.replace(/^\/+/, ''));
}
