import { AudioService, AudioOptions } from './service';
import { TTSConfig, Emotion } from '../tts/types';
import { config } from 'dotenv';
import { getEnvWithFallback } from '../utils/config';

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
    if (process.env.STTS_PRIORITY) {
      envConfig.priority = process.env.STTS_PRIORITY.split(',').map((s) => s.trim());
    }
    if (process.env.STTS_VOICE_GENDER) {
      envConfig.voiceGender = process.env.STTS_VOICE_GENDER as 'male' | 'female';
    }
    const elevenLabsKey = getEnvWithFallback('STTS_ELEVENLABS_API_KEY', 'ELEVENLABS_API_KEY');
    if (elevenLabsKey) {
      envConfig.elevenLabsApiKey = elevenLabsKey;
    }
    const openaiKey = getEnvWithFallback('STTS_OPENAI_API_KEY', 'OPENAI_API_KEY');
    if (openaiKey) {
      envConfig.openaiApiKey = openaiKey;
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
