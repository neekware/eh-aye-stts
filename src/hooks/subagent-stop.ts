#!/usr/bin/env node
import { BaseHook } from './base';
import { SubagentStopEvent } from '../types';
import { detectEmotion, Emotion } from '../tts/index';
import { announceIfEnabled } from './utils';

export class SubagentStopHook extends BaseHook {
  constructor() {
    super('subagent-stop');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

    const event = this.parseInput(input) as SubagentStopEvent;

    // Log the subagent stop event
    this.logEvent({
      type: 'subagent-stop',
      timestamp: new Date().toISOString(),
      data: { ...(event || {}) },
    });

    // Announce subagent completion with appropriate emotion
    let emotion: Emotion = 'neutral';
    let message = 'Agent task completed';

    // Check the reason for more context
    if (event?.reason) {
      emotion = detectEmotion(event.reason);
      // Add context to the message if there's a specific reason
      if (event.reason.toLowerCase().includes('success')) {
        emotion = 'cheerful';
      } else if (
        event.reason.toLowerCase().includes('error') ||
        event.reason.toLowerCase().includes('fail')
      ) {
        emotion = 'disappointed';
        message = 'Agent task encountered an issue';
      }
    } else {
      // Default to cheerful for completed tasks
      emotion = 'cheerful';
    }

    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new SubagentStopHook();
  void hook.run();
}
