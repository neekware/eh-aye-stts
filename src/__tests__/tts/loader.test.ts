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
        voiceGender: 'female',
      });
    });

    it('should accept custom config', () => {
      const config: TTSConfig = { voiceGender: 'male' };
      const customLoader = new TTSLoader(config);
      expect(customLoader['config']).toEqual({
        priority: ['say', 'elevenlabs', 'openai'],
        voiceGender: 'male',
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
      const available = await loader.listAvailable();

      expect(Array.isArray(available)).toBe(true);
      // At least say provider should be available on macOS
      if (process.platform === 'darwin') {
        expect(available).toContain('say');
      }
    });
  });
});
