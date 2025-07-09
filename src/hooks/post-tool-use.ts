#!/usr/bin/env node
import { BaseHook } from './base';
import { PostToolUseEvent } from '../types';
import { detectEmotion, Emotion } from '../tts/index';
import { announceIfEnabled } from './utils';

export class PostToolUseHook extends BaseHook {
  constructor() {
    super('post-tool-use');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
    const event = this.parseInput(input) as PostToolUseEvent;

    if (!event) {
      this.logger.warn('Invalid post-tool-use event');
      return;
    }

    // Log the event with performance metrics
    this.logEvent({
      type: 'post-tool-use',
      timestamp: new Date().toISOString(),
      data: {
        ...event,
        duration: event.duration || 0,
        exitCode: event.exitCode || 0,
      },
    });

    // Announce completion for long-running tasks
    if (event.duration && event.duration > 5000) {
      // 5 seconds
      const seconds = Math.round(event.duration / 1000);
      const toolName = this.getToolDisplayName(event.tool);

      if (event.exitCode === 0) {
        const emotion = 'cheerful';
        await this.announce(`${toolName} completed in ${seconds} seconds`, emotion);
      } else {
        const emotion = 'disappointed';
        await this.announce(`${toolName} failed with error`, emotion);
      }
    }

    // Track performance metrics
    this.trackPerformance(event);
  }

  private getToolDisplayName(tool: string): string {
    const displayNames: Record<string, string> = {
      bash: 'Command',
      shell: 'Shell command',
      read: 'File read',
      write: 'File write',
      search: 'Search',
      grep: 'Grep search',
      find: 'Find',
    };

    return displayNames[tool.toLowerCase()] || tool;
  }

  private async announce(message: string, emotion?: string): Promise<void> {
    try {
      // Use detected emotion if not provided
      const finalEmotion =
        emotion || detectEmotion(message, { success: message.includes('completed') });
      await announceIfEnabled(message, finalEmotion as Emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private trackPerformance(event: PostToolUseEvent): void {
    // Simple performance tracking
    const metrics = {
      tool: event.tool,
      duration: event.duration || 0,
      success: event.exitCode === 0,
      timestamp: new Date().toISOString(),
    };

    this.jsonLogger.info({
      type: 'performance',
      data: metrics,
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PostToolUseHook();
  void hook.run();
}
