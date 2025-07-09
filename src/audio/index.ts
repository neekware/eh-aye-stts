import { AudioService, AudioOptions } from './service';
import { TTSConfig, Emotion } from '../tts/types';
import { config } from 'dotenv';

// Load environment variables
config();

// Singleton instance
let defaultService: AudioService | null = null;

/**
 * Get or create the default audio service
 */
function getDefaultService(): AudioService {
  if (!defaultService) {
    const envConfig: TTSConfig = {};

    // Load config from environment
    if (process.env.TTS_PRIORITY) {
      envConfig.priority = process.env.TTS_PRIORITY.split(',').map((s) => s.trim());
    }
    if (process.env.TTS_VOICE_GENDER) {
      envConfig.voiceGender = process.env.TTS_VOICE_GENDER as 'male' | 'female';
    }
    if (process.env.ELEVENLABS_API_KEY) {
      envConfig.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    }
    if (process.env.OPENAI_API_KEY) {
      envConfig.openaiApiKey = process.env.OPENAI_API_KEY;
    }

    defaultService = new AudioService(envConfig);
  }
  return defaultService;
}

/**
 * Speak text with optional emotion
 */
export async function speak(text: string, options?: AudioOptions): Promise<boolean> {
  const service = getDefaultService();
  return service.speak(text, options);
}

/**
 * Speak with automatic emotion detection
 */
export async function speakWithEmotion(
  text: string,
  context?: { success?: boolean; error?: boolean }
): Promise<boolean> {
  const service = getDefaultService();
  return service.speakWithEmotion(text, context);
}

/**
 * Create a new audio service with custom configuration
 */
export function createAudioService(config?: TTSConfig): AudioService {
  return new AudioService(config);
}

/**
 * Get available TTS providers
 */
export async function getAvailableProviders(): Promise<string[]> {
  const service = getDefaultService();
  return service.getAvailableProviders();
}

// Re-export types and utilities
export { AudioService, AudioOptions } from './service';
export { TTSConfig, Emotion, VoiceGender } from '../tts/types';
export { detectEmotion, getEmotionDescription } from '../tts/emotion-detector';

// Export all available emotions as a constant
export const EMOTIONS: Emotion[] = [
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
