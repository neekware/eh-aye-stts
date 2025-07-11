import { Emotion } from '../tts/types';
import { loadTTS } from '../tts';

interface QueueItem {
  message: string;
  emotion?: Emotion;
  timestamp: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class AudioQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL_MS = 60000;

  async enqueue(message: string, emotion?: Emotion): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        message,
        emotion,
        timestamp: Date.now(),
        resolve,
        reject,
      });

      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        const tts = loadTTS();
        const success = await tts.speak(item.message, item.emotion);

        if (!success && process.env.DEBUG) {
          console.warn('Failed to announce message:', item.message);
        }

        item.resolve();
      } catch (error) {
        if (process.env.DEBUG) {
          console.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
        }
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }

      this.cleanupIfNeeded();
    }

    this.isProcessing = false;
  }

  private cleanupIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL_MS) {
      this.lastCleanup = now;

      const cutoffTime = now - this.CLEANUP_INTERVAL_MS;
      this.queue = this.queue.filter((item) => item.timestamp > cutoffTime);
    }
  }

  clear(): void {
    const rejectedItems = [...this.queue];
    this.queue = [];

    rejectedItems.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
  }

  get size(): number {
    return this.queue.length;
  }

  get processing(): boolean {
    return this.isProcessing;
  }
}

export const audioQueue = new AudioQueue();
