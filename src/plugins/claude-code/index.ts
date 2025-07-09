import { BasePlugin, PluginContext, PluginEvent } from '../base';
import { detectEmotion, Emotion } from '../../tts/emotion-detector';
import {
  PreToolUseEvent,
  PostToolUseEvent,
  NotificationEvent,
  StopEvent,
  SubagentStopEvent,
  AgentEvent,
} from '../../types';

export class ClaudeCodePlugin extends BasePlugin {
  name = 'claude-code';
  description = 'Provides audio notifications for Claude Code events';
  version = '1.0.0';

  init(context: PluginContext): void {
    super.init(context);
    this.logger.info('Claude Code plugin initialized');
  }

  async handleEvent(event: PluginEvent): Promise<void> {
    if (event.source !== 'claude-code') return;

    switch (event.type) {
      case 'pre-tool-use':
        this.handlePreToolUse(event.data as unknown as PreToolUseEvent);
        break;
      case 'post-tool-use':
        await this.handlePostToolUse(event.data as unknown as PostToolUseEvent);
        break;
      case 'notification':
        await this.handleNotification(event.data as unknown as NotificationEvent);
        break;
      case 'stop':
        await this.handleStop(event.data as unknown as StopEvent);
        break;
      case 'subagent-stop':
        await this.handleSubagentStop(event.data as unknown as SubagentStopEvent);
        break;
      case 'agent':
        await this.handleAgent(event.data as unknown as AgentEvent);
        break;
    }
  }

  private handlePreToolUse(event: PreToolUseEvent): void {
    // Pre-tool-use is typically silent to avoid interrupting workflow
    this.logger.debug(`Tool ${event.tool} starting`);
  }

  private async handlePostToolUse(event: PostToolUseEvent): Promise<void> {
    // Only announce long-running tasks
    if (!event.duration || event.duration <= 5000) return;

    const seconds = Math.round(event.duration / 1000);
    const toolName = this.getToolDisplayName(event.tool);

    if (event.exitCode === 0) {
      await this.audio.speak(`${toolName} completed in ${seconds} seconds`, {
        emotion: 'cheerful',
      });
    } else {
      await this.audio.speak(`${toolName} failed with error`, {
        emotion: 'disappointed',
      });
    }
  }

  private async handleNotification(event: NotificationEvent): Promise<void> {
    const emotion = this.detectNotificationEmotion(event);
    await this.audio.speak(event.message, { emotion });
  }

  private async handleStop(event: StopEvent): Promise<void> {
    const messages = ['Session completed', 'Task finished', 'Work complete', 'All done'];
    const message = messages[Math.floor(Math.random() * messages.length)];

    let emotion: Emotion = 'neutral';
    if (event?.exitCode === 0 || !event?.exitCode) {
      emotion = 'cheerful';
    } else if (event?.exitCode !== 0) {
      emotion = 'concerned';
    }

    await this.audio.speak(message, { emotion });
  }

  private async handleSubagentStop(event: SubagentStopEvent): Promise<void> {
    let emotion: Emotion = 'neutral';
    let message = 'Agent task completed';

    // Use task description if available
    if (event.taskDescription) {
      message = `Agent completed: ${event.taskDescription}`;
    }

    // Add duration if available
    if (event.duration) {
      const seconds = Math.round(event.duration / 1000);
      message += ` in ${seconds} seconds`;
    }

    // Determine emotion based on success/failure
    if (event.success !== undefined) {
      emotion = event.success ? 'cheerful' : 'disappointed';
      if (!event.success) {
        message = event.taskDescription
          ? `Agent failed: ${event.taskDescription}`
          : 'Agent task encountered an issue';
      }
    } else if (event?.reason) {
      emotion = detectEmotion(event.reason);
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
      emotion = 'cheerful';
    }

    await this.audio.speak(message, { emotion });
  }

  private async handleAgent(event: AgentEvent): Promise<void> {
    // Check if we should announce this event
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

    await this.audio.speak(message, { emotion });
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

  private detectNotificationEmotion(event: NotificationEvent): Emotion {
    // Check metadata first
    if (event.metadata?.emotion) {
      return event.metadata.emotion as Emotion;
    }

    // Check event type
    if (event.type) {
      switch (event.type) {
        case 'success':
        case 'complete':
          return 'cheerful';
        case 'error':
        case 'failure':
          return 'disappointed';
        case 'warning':
        case 'blocked':
          return 'urgent';
        case 'info':
          return 'neutral';
      }
    }

    // Fall back to content detection
    return detectEmotion(event.message);
  }

  isAvailable(): boolean {
    // Check if we're in a Claude Code environment
    // This could check for specific env vars or config files
    return true;
  }
}
