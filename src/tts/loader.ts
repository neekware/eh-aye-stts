import { TTSProvider, TTSConfig, Emotion } from './types.js';
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

  async speak(text: string, emotionOrProvider?: string, emotion?: Emotion): Promise<boolean> {
    // Handle overloaded parameters
    let providerName: string | undefined;
    let finalEmotion: Emotion | undefined;

    if (emotionOrProvider && this.isEmotion(emotionOrProvider)) {
      finalEmotion = emotionOrProvider as Emotion;
    } else if (emotionOrProvider) {
      providerName = emotionOrProvider;
      finalEmotion = emotion;
    }

    // Use default emotion if none provided
    if (!finalEmotion) {
      finalEmotion = this.config.defaultEmotion;
    }

    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider && (await provider.isAvailable())) {
        return await provider.speak(text, finalEmotion);
      }
      return false;
    }

    // Try providers in priority order
    for (const name of this.config.priority!) {
      const provider = this.providers.get(name);
      if (provider && (await provider.isAvailable())) {
        return await provider.speak(text, finalEmotion);
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

  private isEmotion(value: string): boolean {
    const emotions = [
      'cheerful',
      'neutral',
      'concerned',
      'urgent',
      'disappointed',
      'excited',
      'sarcastic',
      'calm',
      'angry',
      'empathetic',
      'confused',
      'hopeful',
      'fearful',
      'melancholic',
      'curious',
    ];
    return emotions.includes(value);
  }
}
