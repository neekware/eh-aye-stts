#!/usr/bin/env node
import { BaseHook } from './base';
import { StopEvent } from '../types';
import { Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';
import { debugLogger } from '../../../utils/debug-logger';

export class StopHook extends BaseHook {
  constructor() {
    super('stop');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

    const event = this.parseInput(input) as StopEvent;

    debugLogger.hook('stop', 'execute', { event });

    // Log the stop event
    this.logEvent({
      type: 'stop',
      timestamp: new Date().toISOString(),
      data: { ...(event || {}) },
    });

    // Generate session summary message
    const message = this.getStaticMessage();
    const emotion = this.determineEmotion(event);

    debugLogger.info('stop', 'generated_message', message, { emotion });

    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      debugLogger.error(
        'stop',
        'tts_error',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private getStaticMessage(): string {
    const messages = ['Session completed', 'Task finished', 'Work complete', 'All done'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private determineEmotion(event: StopEvent | null): Emotion {
    // Check exit code
    if (event?.exitCode === 0 || !event?.exitCode) {
      return 'cheerful';
    } else if (event?.exitCode !== 0) {
      return 'concerned';
    }

    return 'neutral';
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
