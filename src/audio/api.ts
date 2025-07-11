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
    defaultService = new AudioService();
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
