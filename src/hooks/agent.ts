#!/usr/bin/env node
import { BaseHook } from './base';
import { AgentEvent } from '../types';
import { Emotion } from '../tts/index';
import { announceIfEnabled } from './utils';

export class AgentHook extends BaseHook {
  constructor() {
    super('agent');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
    const event = this.parseInput(input) as AgentEvent;

    if (!event) {
      this.logger.warn('Invalid agent event');
      return;
    }

    // Log the event
    this.logEvent({
      type: 'agent',
      timestamp: new Date().toISOString(),
      data: { ...event },
    });

    // Check if we should announce
    if (event.metadata?.announce === false) {
      return;
    }

    // Determine emotion
    let emotion: Emotion = 'neutral';
    if (event.metadata?.emotion) {
      emotion = event.metadata.emotion as Emotion;
    } else {
      switch (event.type) {
        case 'start':
          emotion = 'neutral';
          break;
        case 'progress':
          emotion = 'calm';
          break;
        case 'complete':
          emotion = 'cheerful';
          break;
        case 'error':
          emotion = 'concerned';
          break;
      }
    }

    // Build message
    let message = '';
    if (event.message) {
      message = event.message;
    } else {
      switch (event.type) {
        case 'start':
          message = event.taskDescription
            ? `Starting background task: ${event.taskDescription}`
            : 'Starting background agent task';
          break;
        case 'progress':
          if (event.progress !== undefined) {
            message = `Background task ${event.progress}% complete`;
          } else {
            message = 'Background task in progress';
          }
          break;
        case 'complete':
          message = event.taskDescription
            ? `Background task completed: ${event.taskDescription}`
            : 'Background agent task completed';
          break;
        case 'error':
          message = event.taskDescription
            ? `Background task failed: ${event.taskDescription}`
            : 'Background agent task failed';
          break;
      }
    }

    // Only announce high priority progress updates
    if (event.type === 'progress' && event.metadata?.priority !== 'high') {
      return;
    }

    // Announce the message
    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new AgentHook();
  void hook.run();
}
