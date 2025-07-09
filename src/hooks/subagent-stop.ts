#!/usr/bin/env node
import { BaseHook } from './base.js';
import { SubagentStopEvent } from '../types.js';
import { loadTTS } from '../tts/index.js';

export class SubagentStopHook extends BaseHook {
  private tts = loadTTS();

  constructor() {
    super('subagent-stop');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
    const event = this.parseInput(input) as SubagentStopEvent;

    // Log the subagent stop event
    this.logEvent({
      type: 'subagent-stop',
      timestamp: new Date().toISOString(),
      data: event || {},
    });

    // Announce subagent completion
    try {
      await this.tts.speak('Agent task completed');
    } catch (error) {
      this.logger.error(`TTS error: ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new SubagentStopHook();
  hook.run();
}
