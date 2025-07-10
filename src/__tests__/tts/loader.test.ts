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
      expect(loader['config']).toEqual({
        priority: ['say', 'elevenlabs', 'openai'],
        voiceType: 'female',
      });
    });

    it('should accept custom config', () => {
      const config: TTSConfig = { voiceType: 'male' };
      const customLoader = new TTSLoader(config);
      expect(customLoader['config']).toEqual({
        priority: ['say', 'elevenlabs', 'openai'],
        voiceType: 'male',
      });
    });

    it('should have providers map', () => {
      expect(loader['providers']).toBeDefined();
      expect(loader['providers'] instanceof Map).toBe(true);
      expect(loader['providers'].size).toBeGreaterThan(0);
    });
  });

  describe('listAvailable', () => {
    it('should return array of available provider names', async () => {
      // Mock isAvailable for providers to avoid actual system checks
      const mockProviders = new Map();
      mockProviders.set('say', { isAvailable: vi.fn().mockResolvedValue(true) });
      mockProviders.set('elevenlabs', { isAvailable: vi.fn().mockResolvedValue(false) });
      mockProviders.set('openai', { isAvailable: vi.fn().mockResolvedValue(false) });

      // Replace the providers map
      (loader as any).providers = mockProviders;

      const available = await loader.listAvailable();

      expect(Array.isArray(available)).toBe(true);
      expect(available).toContain('say');
      expect(available).not.toContain('elevenlabs');
      expect(available).not.toContain('openai');
    }, 10000); // Increase timeout to 10 seconds
  });
});
