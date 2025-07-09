import { getConfigValue } from '../utils/config';
import { loadTTS } from '../tts';
import { Emotion } from '../tts/types';

export async function announceIfEnabled(message: string, emotion?: Emotion): Promise<void> {
  // Check if audio is enabled
  const audioEnabled = getConfigValue('audioEnabled', true);
  if (!audioEnabled) {
    return;
  }

  try {
    const tts = loadTTS();
    const success = await tts.speak(message, emotion);
    if (!success && process.env.DEBUG) {
      console.warn('Failed to announce message');
    }
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
