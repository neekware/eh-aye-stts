import { describe, it, expect } from 'vitest';
import { BaseTTSProvider } from '../../../tts/providers/base';
import { TTSConfig, Emotion } from '../../../tts/types';

class TestProvider extends BaseTTSProvider {
  name = 'test-provider';

  async speak(text: string, emotion?: Emotion): Promise<boolean> {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('BaseTTSProvider', () => {
  it('should have required name property', () => {
    const provider = new TestProvider({});
    expect(provider.name).toBe('test-provider');
  });

  it('should store config', () => {
    const config: TTSConfig = { voiceType: 'female' };
    const provider = new TestProvider(config);
    expect(provider['config']).toEqual(config);
  });

  it('should implement abstract methods', async () => {
    const provider = new TestProvider({});

    expect(await provider.speak('test')).toBe(true);
    expect(await provider.isAvailable()).toBe(true);
  });

  it('should handle emotion parameter', async () => {
    const provider = new TestProvider({});

    expect(await provider.speak('test', 'cheerful')).toBe(true);
  });
});
