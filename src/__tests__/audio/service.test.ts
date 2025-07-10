import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioService } from '../../audio/service';
import { TTSLoader } from '../../tts/loader';

vi.mock('../../tts/loader');

describe('AudioService', () => {
  let audioService: AudioService;
  let mockTTSLoader: any;

  beforeEach(() => {
    mockTTSLoader = {
      speak: vi.fn().mockResolvedValue(true),
      listAvailable: vi.fn().mockResolvedValue(['say', 'openai']),
      config: {},
    };

    vi.mocked(TTSLoader).mockImplementation(() => mockTTSLoader);

    audioService = new AudioService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('speak', () => {
    it('should speak with default options', async () => {
      const result = await audioService.speak('Hello world');

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('Hello world', undefined);
    });

    it('should speak with emotion', async () => {
      const result = await audioService.speak('Great job!', { emotion: 'cheerful' });

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('Great job!', 'cheerful');
    });

    it('should speak with specific provider', async () => {
      const result = await audioService.speak('Test', { provider: 'openai' });

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('Test', 'openai', undefined);
    });

    it('should auto-detect emotion when enabled', async () => {
      const result = await audioService.speak('Oh no! Something went wrong!', {
        autoDetectEmotion: true,
      });

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith(
        'Oh no! Something went wrong!',
        'disappointed' // detectEmotion will return this for error text
      );
    });

    it('should handle speak failure', async () => {
      mockTTSLoader.speak.mockResolvedValue(false);

      const result = await audioService.speak('Test');

      expect(result).toBe(false);
    });

    it('should handle speak error', async () => {
      mockTTSLoader.speak.mockRejectedValue(new Error('TTS error'));

      // The AudioService doesn't have try-catch, so it will throw
      await expect(audioService.speak('Test')).rejects.toThrow('TTS error');
    });
  });

  describe('speakWithEmotion', () => {
    it('should speak with emotion based on success context', async () => {
      const result = await audioService.speakWithEmotion('Task completed', { success: true });

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('Task completed', 'cheerful');
    });

    it('should speak with emotion based on error context', async () => {
      const result = await audioService.speakWithEmotion('Task failed', { error: true });

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('Task failed', 'disappointed');
    });

    it('should detect emotion from text when no context provided', async () => {
      const result = await audioService.speakWithEmotion('This is amazing!');

      expect(result).toBe(true);
      expect(mockTTSLoader.speak).toHaveBeenCalledWith('This is amazing!', 'excited');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', async () => {
      const providers = await audioService.getAvailableProviders();

      expect(providers).toEqual(['say', 'openai']);
      expect(mockTTSLoader.listAvailable).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return TTS configuration', () => {
      mockTTSLoader.config = { voiceType: 'female' };

      const config = audioService.getConfig();

      expect(config).toEqual({ voiceType: 'female' });
    });
  });
});
