import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MessageCache } from '../../services/message-cache';
import { HookContext } from '../../plugins/claude-code/hooks/context-builder';
import * as config from '../../utils/config';

vi.mock('../../utils/config');

describe('MessageCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MessageCache.clear();
    vi.mocked(config.getConfigValue).mockReturnValue(300); // Default TTL
  });

  afterEach(() => {
    vi.restoreAllMocks();
    MessageCache.stopPeriodicCleanup();
  });

  describe('getCacheKey', () => {
    it('should generate cache key from context', () => {
      const context: HookContext = {
        eventType: 'post-tool-use',
        timestamp: new Date().toISOString(),
        tool: 'build',
        exitCode: 0,
        duration: 45000,
        projectName: 'test',
        cwd: '/test',
      };

      const key = MessageCache.getCacheKey(context);
      expect(key).toBe('post-tool-use-build-0-long');
    });

    it('should handle missing fields', () => {
      const context: HookContext = {
        eventType: 'notification',
        timestamp: new Date().toISOString(),
        projectName: 'test',
        cwd: '/test',
      };

      const key = MessageCache.getCacheKey(context);
      expect(key).toBe('notification-none-unknown');
    });

    it('should bucket durations correctly', () => {
      const contexts = [
        { duration: 2000, expected: 'quick' },
        { duration: 15000, expected: 'moderate' },
        { duration: 60000, expected: 'long' },
        { duration: 180000, expected: 'very-long' },
      ];

      contexts.forEach(({ duration, expected }) => {
        const context: HookContext = {
          eventType: 'post-tool-use',
          timestamp: new Date().toISOString(),
          tool: 'test',
          exitCode: 0,
          duration,
          projectName: 'test',
          cwd: '/test',
        };

        const key = MessageCache.getCacheKey(context);
        expect(key).toContain(expected);
      });
    });

    it('should include error status for stop events', () => {
      const contextWithErrors: HookContext = {
        eventType: 'stop',
        timestamp: new Date().toISOString(),
        projectName: 'test',
        cwd: '/test',
        errorCount: 5,
      };

      const contextNoErrors: HookContext = {
        eventType: 'stop',
        timestamp: new Date().toISOString(),
        projectName: 'test',
        cwd: '/test',
        errorCount: 0,
      };

      expect(MessageCache.getCacheKey(contextWithErrors)).toContain('with-errors');
      expect(MessageCache.getCacheKey(contextNoErrors)).toContain('no-errors');
    });
  });

  describe('get and set', () => {
    it('should store and retrieve messages', () => {
      const key = 'test-key';
      const message = 'Test message';

      MessageCache.set(key, message);
      const retrieved = MessageCache.get(key);

      expect(retrieved).toBe(message);
    });

    it('should return null for non-existent keys', () => {
      const result = MessageCache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire old entries based on TTL', () => {
      vi.mocked(config.getConfigValue).mockReturnValue(1); // 1 second TTL

      const key = 'test-key';
      const message = 'Test message';

      MessageCache.set(key, message);
      expect(MessageCache.get(key)).toBe(message);

      // Fast forward time
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000); // 2 seconds

      expect(MessageCache.get(key)).toBeNull();

      vi.useRealTimers();
    });

    it('should handle LRU eviction when cache is full', () => {
      // Note: The actual MAX_CACHE_SIZE in MessageCache is 500
      // We'll test that it respects the limit by filling it up
      const MAX_CACHE_SIZE = 500;

      // Fill the cache to its limit
      for (let i = 0; i < MAX_CACHE_SIZE; i++) {
        MessageCache.set(`key-${i}`, `message-${i}`);
      }

      // Cache should be at max size
      expect(MessageCache.size()).toBe(MAX_CACHE_SIZE);

      // Add one more entry
      MessageCache.set('key-new', 'new-message');

      // The new entry should be present
      expect(MessageCache.get('key-new')).toBe('new-message');

      // Cache size should be MAX_CACHE_SIZE - BATCH_EVICT_SIZE + 1 (batch eviction occurred)
      // MessageCache evicts 100 entries at once when full
      expect(MessageCache.size()).toBe(401); // 500 - 100 + 1
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      vi.mocked(config.getConfigValue).mockReturnValue(1); // 1 second TTL
      vi.useFakeTimers();

      // Add multiple entries at different times
      MessageCache.set('key1', 'message1');

      vi.advanceTimersByTime(500); // 0.5 seconds
      MessageCache.set('key2', 'message2');

      vi.advanceTimersByTime(600); // Total: 1.1 seconds

      // key1 should be expired, key2 should still be valid
      MessageCache.cleanup();

      expect(MessageCache.get('key1')).toBeNull();
      expect(MessageCache.get('key2')).toBe('message2');

      vi.useRealTimers();
    });

    it('should handle periodic cleanup', () => {
      vi.useFakeTimers();
      const cleanupSpy = vi.spyOn(MessageCache, 'cleanup');

      MessageCache.startPeriodicCleanup(1); // 1 minute interval

      // Fast forward 3 minutes
      vi.advanceTimersByTime(3 * 60 * 1000);

      expect(cleanupSpy).toHaveBeenCalledTimes(3);

      MessageCache.stopPeriodicCleanup();
      vi.useRealTimers();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      MessageCache.set('key1', 'message1');
      MessageCache.set('key2', 'message2');
      MessageCache.set('key3', 'message3');

      expect(MessageCache.size()).toBe(3);

      MessageCache.clear();

      expect(MessageCache.size()).toBe(0);
      expect(MessageCache.get('key1')).toBeNull();
      expect(MessageCache.get('key2')).toBeNull();
      expect(MessageCache.get('key3')).toBeNull();
    });
  });
});
