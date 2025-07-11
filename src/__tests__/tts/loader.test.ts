import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTSLoader } from '../../tts/loader';
import { TTSConfig } from '../../tts/types';

describe('TTSLoader', () => {
  let loader: TTSLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new TTSLoader();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(loader['config']).toEqual({});
    });

    it('should accept custom config', () => {
      const config: TTSConfig = {};
      const customLoader = new TTSLoader(config);
      expect(customLoader['config']).toEqual({});
    });

    it('should have system provider', () => {
      expect(loader['provider']).toBeDefined();
      expect(loader['provider'].name).toBe('system');
    });
  });

  describe('listAvailable', () => {
    it('should return array of available provider names', async () => {
      // Mock isAvailable for the system provider
      const mockProvider = {
        name: 'system',
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      // Replace the provider
      (loader as any).provider = mockProvider;

      const available = await loader.listAvailable();

      expect(Array.isArray(available)).toBe(true);
      expect(available).toEqual(['system']);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });
  });
});
