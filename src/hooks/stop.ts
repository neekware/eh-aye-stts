#!/usr/bin/env node
import { BaseHook } from './base.js';
import { StopEvent } from '../types.js';
import { loadTTS } from '../tts/index.js';

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
      data: event || {},
    });

    // Announce session end
    const messages = ['Session completed', 'Task finished', 'Work complete', 'All done'];

    const message = messages[Math.floor(Math.random() * messages.length)];

    try {
      await this.tts.speak(message);
    } catch (error) {
      this.logger.error(`TTS error: ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  hook.run();
}
