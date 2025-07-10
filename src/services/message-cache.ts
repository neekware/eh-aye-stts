import { HookContext } from '../plugins/claude-code/hooks/context-builder';
import { getConfigValue } from '../utils/config';

interface CacheEntry {
  message: string;
  prompt?: string;
  timestamp: number;
  key: string;
}

type CacheEventListener = (event: CacheEvent) => void;

interface CacheEvent {
  type: 'set' | 'hit' | 'miss' | 'evict';
  key: string;
  message?: string;
  timestamp: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  memoryUsage: number;
}

export class MessageCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 300; // 5 minutes in seconds
  private static readonly MAX_CACHE_SIZE = 500;
  private static readonly BATCH_EVICT_SIZE = 100;
  private static hits = 0;
  private static misses = 0;
  private static lastPrompt: string | null = null;
  private static listeners: CacheEventListener[] = [];

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
    if (!entry) {
      this.misses++;
      this.notifyListeners({ type: 'miss', key, timestamp: Date.now() });
      return null;
    }

    const ttl = getConfigValue('llmCacheTTL', this.DEFAULT_TTL) * 1000;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      this.misses++;
      this.notifyListeners({ type: 'miss', key, timestamp: Date.now() });
      return null;
    }

    this.hits++;
    this.notifyListeners({ type: 'hit', key, timestamp: Date.now() });
    return entry.message;
  }

  static set(key: string, message: string, prompt?: string): void {
    // Store the last prompt for debugging
    if (prompt) {
      this.lastPrompt = prompt;
    }

    // Implement FIFO batch eviction if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestBatch();
    }

    const entry: CacheEntry = {
      message,
      prompt: prompt || this.lastPrompt || undefined,
      timestamp: Date.now(),
      key,
    };

    this.cache.set(key, entry);
    this.notifyListeners({ type: 'set', key, message, timestamp: Date.now() });
  }

  static clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.lastPrompt = null;
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

  private static evictOldestBatch(): void {
    // Sort entries by timestamp
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    // Remove the oldest BATCH_EVICT_SIZE entries
    const toEvict = entries.slice(0, this.BATCH_EVICT_SIZE);
    toEvict.forEach(([key]) => {
      this.cache.delete(key);
      this.notifyListeners({ type: 'evict', key, timestamp: Date.now() });
    });
  }

  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    let memoryUsage = 0;

    entries.forEach((entry) => {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
      // Rough memory estimation
      memoryUsage += entry.message.length + (entry.prompt?.length || 0) + 100; // overhead
    });

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      oldestEntry,
      newestEntry,
      memoryUsage,
    };
  }

  static getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  static getRecentEntries(count: number): CacheEntry[] {
    return this.getAllEntries().slice(0, count);
  }

  static onCacheUpdate(listener: CacheEventListener): void {
    this.listeners.push(listener);
  }

  static offCacheUpdate(listener: CacheEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private static notifyListeners(event: CacheEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache listener error:', error);
      }
    });
  }

  static setLastPrompt(prompt: string): void {
    this.lastPrompt = prompt;
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
