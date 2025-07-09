#!/usr/bin/env node
import { BaseHook } from './base.js';
import { PostToolUseEvent } from '../types.js';
import { loadTTS } from '../tts/index.js';

export class PostToolUseHook extends BaseHook {
  private tts = loadTTS();

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
        exitCode: event.exitCode || 0
      }
    });

    // Announce completion for long-running tasks
    if (event.duration && event.duration > 5000) { // 5 seconds
      const seconds = Math.round(event.duration / 1000);
      const toolName = this.getToolDisplayName(event.tool);
      
      if (event.exitCode === 0) {
        await this.announce(`${toolName} completed in ${seconds} seconds`);
      } else {
        await this.announce(`${toolName} failed with error`);
      }
    }

    // Track performance metrics
    await this.trackPerformance(event);
  }

  private getToolDisplayName(tool: string): string {
    const displayNames: Record<string, string> = {
      'bash': 'Command',
      'shell': 'Shell command',
      'read': 'File read',
      'write': 'File write',
      'search': 'Search',
      'grep': 'Grep search',
      'find': 'Find'
    };
    
    return displayNames[tool.toLowerCase()] || tool;
  }

  private async announce(message: string): Promise<void> {
    try {
      const success = await this.tts.speak(message);
      if (!success) {
        this.logger.warn('Failed to announce message');
      }
    } catch (error) {
      this.logger.error(`TTS error: ${error}`);
    }
  }

  private async trackPerformance(event: PostToolUseEvent): Promise<void> {
    // Simple performance tracking
    const metrics = {
      tool: event.tool,
      duration: event.duration || 0,
      success: event.exitCode === 0,
      timestamp: new Date().toISOString()
    };

    this.jsonLogger.info({
      type: 'performance',
      data: metrics
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PostToolUseHook();
  hook.run();
}