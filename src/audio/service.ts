import { TTSLoader } from '../tts/loader';
import { TTSConfig, Emotion } from '../tts/types';
import { detectEmotion } from '../tts/emotion-detector';

export interface AudioOptions {
  emotion?: Emotion;
  provider?: string;
  autoDetectEmotion?: boolean;
}

export class AudioService {
  private tts: TTSLoader;

  constructor(config?: TTSConfig) {
    this.tts = new TTSLoader(config);
  }

  /**
   * Speak text with optional emotion and provider
   */
  async speak(text: string, options?: AudioOptions): Promise<boolean> {
    const emotion =
      options?.emotion || (options?.autoDetectEmotion ? detectEmotion(text) : undefined);

    if (options?.provider) {
      return this.tts.speak(text, options.provider, emotion);
    }

    return this.tts.speak(text, emotion);
  }

  /**
   * Speak with automatic emotion detection
   */
  async speakWithEmotion(
    text: string,
    context?: { success?: boolean; error?: boolean }
  ): Promise<boolean> {
    const emotion = detectEmotion(text, context);
    return this.tts.speak(text, emotion);
  }

  /**
   * Get available TTS providers
   */
  async getAvailableProviders(): Promise<string[]> {
    return this.tts.listAvailable();
  }

  /**
   * Get the current TTS configuration
   */
  getConfig(): TTSConfig {
    return this.tts['config'];
  }
}
