import { TTSLoader } from '../tts/loader';
import { TTSConfig, Emotion } from '../tts/types';

export interface AudioOptions {
  emotion?: Emotion;
}

export class AudioService {
  private tts: TTSLoader;

  constructor(config?: TTSConfig) {
    this.tts = new TTSLoader(config);
  }

  /**
   * Speak text with optional emotion
   */
  async speak(text: string, options?: AudioOptions): Promise<boolean> {
    return this.tts.speak(text, options?.emotion);
  }

  /**
   * Speak text with emotion based on context
   */
  async speakWithEmotion(
    text: string,
    context?: { success?: boolean; error?: boolean }
  ): Promise<boolean> {
    let emotion: Emotion | undefined;

    if (context?.success) {
      emotion = 'cheerful';
    } else if (context?.error) {
      emotion = 'disappointed';
    } else {
      emotion = 'neutral';
    }

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
