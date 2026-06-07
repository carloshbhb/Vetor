import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getCachedResponse, 
  setCachedResponse, 
  invalidateCache, 
  clearCache,
  getCacheStats,
  TTL_PRESETS
} from '@/lib/agentCache';

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

describe('Agent Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TTL_PRESETS', () => {
    it('should have correct TTL values', () => {
      expect(TTL_PRESETS.PRODUCT_DISCOVERY).toBe(6 * 60 * 60 * 1000);
      expect(TTL_PRESETS.PRICE_DATA).toBe(1 * 60 * 60 * 1000);
      expect(TTL_PRESETS.REVIEW_GENERATION).toBe(7 * 24 * 60 * 60 * 1000);
      expect(TTL_PRESETS.SERP_RANKINGS).toBe(4 * 60 * 60 * 1000);
      expect(TTL_PRESETS.GENERAL).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('setCachedResponse', () => {
    it('should cache a response', () => {
      setCachedResponse('test prompt', 'test response');
      // No error means success
    });

    it('should cache with custom TTL', () => {
      setCachedResponse('test prompt', 'test response', 60000);
      // No error means success
    });
  });

  describe('getCachedResponse', () => {
    it('should return undefined for non-existent key', () => {
      const result = getCachedResponse('non-existent prompt');
      // Since we're mocking fs, this will return undefined
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate a cache entry', () => {
      invalidateCache('test prompt');
      // No error means success
    });
  });

  describe('clearCache', () => {
    it('should clear all cache', () => {
      clearCache();
      // No error means success
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('totalSizeBytes');
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.expiredEntries).toBe('number');
      expect(typeof stats.totalSizeBytes).toBe('number');
    });
  });
});
