import { AudioService, AudioOptions } from './service';
import { TTSConfig, Emotion } from '../tts/types';
import { config } from 'dotenv';
import { getEnvWithFallback } from '../utils/config';
import { TTS_ENV_VARS } from '../defaults';

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
    const priority = process.env[TTS_ENV_VARS.PRIORITY];
    if (priority) {
      envConfig.priority = priority.split(',').map((s) => s.trim());
    }
    if (process.env[TTS_ENV_VARS.VOICE_TYPE]) {
      envConfig.voiceType = process.env[TTS_ENV_VARS.VOICE_TYPE] as 'male' | 'female';
    }
    const elevenLabsKey = getEnvWithFallback(TTS_ENV_VARS.ELEVENLABS_API_KEY, 'ELEVENLABS_API_KEY');
    if (elevenLabsKey) {
      envConfig.elevenLabsApiKey = elevenLabsKey;
    }
    const openaiKey = getEnvWithFallback(TTS_ENV_VARS.OPENAI_API_KEY, 'OPENAI_API_KEY');
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
