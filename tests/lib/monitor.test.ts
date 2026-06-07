import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, recordMetric, createTimer, getAgentStats } from '@/lib/monitor';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Monitor System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTimer', () => {
    it('should return elapsed time', async () => {
      const timer = createTimer();
      await new Promise(resolve => setTimeout(resolve, 100));
      const elapsed = timer.stop();
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('logger', () => {
    it('should log info messages', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await logger.info('Test message', 'test-source', { key: 'value' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning messages', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await logger.warn('Warning message', 'test-source');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error messages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await logger.error('Error message', 'test-source', new Error('Test error'));
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('recordMetric', () => {
    it('should record a metric successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await recordMetric({
        agentName: 'test-agent',
        operation: 'test-operation',
        durationMs: 1000,
        success: true,
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should record failed metric', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await recordMetric({
        agentName: 'test-agent',
        operation: 'test-operation',
        durationMs: 500,
        success: false,
        errorMessage: 'Test error',
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
