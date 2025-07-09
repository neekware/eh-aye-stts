import { TTSProvider, TTSConfig } from './types.js';
import { SayProvider } from './providers/say.js';
import { ElevenLabsProvider } from './providers/elevenlabs.js';
import { OpenAIProvider } from './providers/openai.js';

export class TTSLoader {
  private providers: Map<string, TTSProvider> = new Map();
  private config: TTSConfig;

  constructor(config: TTSConfig = {}) {
    this.config = {
      priority: ['say', 'elevenlabs', 'openai'],
      voiceGender: 'female',
      ...config,
    };

    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('say', new SayProvider(this.config));
    this.providers.set('elevenlabs', new ElevenLabsProvider(this.config));
    this.providers.set('openai', new OpenAIProvider(this.config));
  }

  async speak(text: string, providerName?: string): Promise<boolean> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider && (await provider.isAvailable())) {
        return await provider.speak(text);
      }
      return false;
    }

    // Try providers in priority order
    for (const name of this.config.priority!) {
      const provider = this.providers.get(name);
      if (provider && (await provider.isAvailable())) {
        return await provider.speak(text);
      }
    }

    return false;
  }

  async getProvider(): Promise<TTSProvider | null> {
    for (const name of this.config.priority!) {
      const provider = this.providers.get(name);
      if (provider && (await provider.isAvailable())) {
        return provider;
      }
    }
    return null;
  }

  async listAvailable(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }
}
