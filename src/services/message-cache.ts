import { HookContext } from '../plugins/claude-code/hooks/context-builder';
import { getConfigValue } from '../utils/config';

interface CacheEntry {
  message: string;
  timestamp: number;
}

export class MessageCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 300; // 5 minutes in seconds
  private static readonly MAX_CACHE_SIZE = 100;

  static getCacheKey(context: HookContext): string {
    // Create a cache key based on event type and key characteristics
    const parts = [
      context.eventType,
      context.tool || 'none',
      context.exitCode !== undefined ? context.exitCode.toString() : 'unknown',
    ];

    // Add duration bucket for long-running tasks
    if (context.duration) {
      const durationBucket = this.getDurationBucket(context.duration);
      parts.push(durationBucket);
    }

    // Add session characteristics for stop events
    if (context.eventType === 'stop' && context.errorCount !== undefined) {
      parts.push(context.errorCount > 0 ? 'with-errors' : 'no-errors');
    }

    return parts.join('-');
  }

  static get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = getConfigValue('llmCacheTTL', this.DEFAULT_TTL) * 1000;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.message;
  }

  static set(key: string, message: string): void {
    // Implement LRU eviction if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      message,
      timestamp: Date.now(),
    });
  }

  static clear(): void {
    this.cache.clear();
  }

  static size(): number {
    return this.cache.size;
  }

  static cleanup(): void {
    const ttl = getConfigValue('llmCacheTTL', this.DEFAULT_TTL) * 1000;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  private static getDurationBucket(duration: number): string {
    const seconds = duration / 1000;
    if (seconds < 5) return 'quick';
    if (seconds < 30) return 'moderate';
    if (seconds < 120) return 'long';
    return 'very-long';
  }

  private static findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Periodic cleanup task
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static startPeriodicCleanup(intervalMinutes = 5): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      intervalMinutes * 60 * 1000
    );
  }

  static stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
