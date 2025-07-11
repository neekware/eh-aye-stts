import { getConfigValue } from '../utils/config';
import { Emotion } from './types';
import { audioQueue } from '../utils/audio-queue';

export async function announceIfEnabled(message: string, emotion?: Emotion): Promise<void> {
  // Check if audio is enabled
  const audioEnabled = getConfigValue('audioEnabled', true);
  if (!audioEnabled) {
    return;
  }

  try {
    await audioQueue.enqueue(message, emotion);
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(`Audio queue error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
