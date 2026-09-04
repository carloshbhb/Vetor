import { describe, it, expect } from 'vitest';
import { isImageReachable, resolveProductImage } from '@/lib/mercadolivre';

describe('Image guarantee helpers', () => {
  describe('isImageReachable', () => {
    it('returns false for empty or non-http URLs without network', async () => {
      await expect(isImageReachable('')).resolves.toBe(false);
      await expect(isImageReachable('notaurl')).resolves.toBe(false);
    });

    it('returns false for unresolvable hosts', async () => {
      await expect(isImageReachable('https://invalid.invalid/x.webp', 3000)).resolves.toBe(false);
    });
  });

  describe('resolveProductImage', () => {
    it('returns empty for blank product without network calls', async () => {
      await expect(resolveProductImage('')).resolves.toEqual({ imageUrl: '', source: 'Not Found' });
      await expect(resolveProductImage('   ')).resolves.toEqual({ imageUrl: '', source: 'Not Found' });
    });
  });
});
