import { Emotion } from './types';
import { loadTTS } from './index';

export async function announceIfEnabled(message: string, emotion?: Emotion): Promise<void> {
  try {
    const tts = loadTTS();
    const success = await tts.speak(message, emotion);

    if (!success && process.env.DEBUG) {
      console.warn('Failed to announce message:', message);
    }
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
