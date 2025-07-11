#!/usr/bin/env node
import { BaseHook } from './base';
import { PostToolUseEvent } from '../types';
import { detectEmotion, Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';

export class PostToolUseHook extends BaseHook {
  constructor() {
    super('post-tool-use');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

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

    // Only announce for significant events
    if (!this.shouldAnnounce(event)) {
      return;
    }

    // Generate message
    const message = this.getStaticMessage(event);
    const emotion = this.determineEmotion(event);

    // Announce the message
    await announceIfEnabled(message, emotion);

    // Track performance metrics
    this.trackPerformance(event);
  }

  private shouldAnnounce(event: PostToolUseEvent): boolean {
    // Announce long-running commands (>5s)
    if (event.duration && event.duration > 5000) return true;

    // Announce failures
    if (event.exitCode !== 0) return true;

    // Announce specific important tools
    const importantTools = ['build', 'test', 'deploy', 'install', 'npm', 'yarn', 'pnpm'];
    if (importantTools.some((tool) => event.tool.toLowerCase().includes(tool))) return true;

    return false;
  }

  private getStaticMessage(event: PostToolUseEvent): string {
    const seconds = Math.round((event.duration || 0) / 1000);
    const toolName = this.getToolDisplayName(event.tool);

    if (event.exitCode === 0) {
      if (seconds > 0) {
        return `${toolName} completed in ${seconds} seconds`;
      }
      return `${toolName} completed`;
    } else {
      return `${toolName} failed with error`;
    }
  }

  private determineEmotion(event: PostToolUseEvent): Emotion {
    if (event.exitCode === 0) {
      // Long tasks get calm emotion
      if (event.duration && event.duration > 10000) {
        return 'calm';
      }
      return 'cheerful';
    } else {
      return 'concerned';
    }
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
