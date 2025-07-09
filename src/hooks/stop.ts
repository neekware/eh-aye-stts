#!/usr/bin/env node
import { BaseHook } from './base';
import { StopEvent } from '../types';
import { loadTTS, Emotion } from '../tts/index';

export class StopHook extends BaseHook {
  private tts = loadTTS();

  constructor() {
    super('stop');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
    const event = this.parseInput(input) as StopEvent;

    // Log the stop event
    this.logEvent({
      type: 'stop',
      timestamp: new Date().toISOString(),
      data: { ...(event || {}) },
    });

    // Announce session end with appropriate emotion
    const messages = ['Session completed', 'Task finished', 'Work complete', 'All done'];
    const message = messages[Math.floor(Math.random() * messages.length)];

    // Determine emotion based on exit code and reason
    let emotion: Emotion = 'neutral';
    if (event?.exitCode === 0 || !event?.exitCode) {
      emotion = 'cheerful'; // Success
    } else if (event?.exitCode !== 0) {
      emotion = 'concerned'; // Non-zero exit code
    }

    try {
      await this.tts.speak(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
