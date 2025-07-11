import { TTSProvider, TTSConfig, Emotion } from './types';
import { SayProvider } from './providers/say';
import { config } from 'dotenv';

config(); // Load .env file

export class TTSLoader {
  private provider: TTSProvider;
  private config: TTSConfig;

  constructor(config: TTSConfig = {}) {
    this.config = config;
    this.provider = new SayProvider(this.config);
  }

  async speak(text: string, emotion?: Emotion): Promise<boolean> {
    if (await this.provider.isAvailable()) {
      return await this.provider.speak(text, emotion);
    }
    return false;
  }

  async getProvider(): Promise<TTSProvider | null> {
    if (await this.provider.isAvailable()) {
      return this.provider;
    }
    return null;
  }

  async listAvailable(): Promise<string[]> {
    if (await this.provider.isAvailable()) {
      return ['system'];
    }
    return [];
  }
}

export function loadTTS(userConfig: TTSConfig = {}): TTSLoader {
  return new TTSLoader(userConfig);
}
