import { BasePlugin, PluginContext, PluginEvent } from '../base';
import { Emotion } from '../../tts/types';
import {
  PreToolUseEvent,
  PostToolUseEvent,
  NotificationEvent,
  StopEvent,
  SubagentStopEvent,
} from './types';
import { VERSION } from '../../utils/version';
import { extractAndSaveChat } from '../../utils/chat';

export class ClaudeCodePlugin extends BasePlugin {
  name = 'claude';
  description = 'Provides audio notifications for Claude events';
  version = VERSION;

  init(context: PluginContext): void {
    super.init(context);
    this.logger.info('Claude plugin initialized');
  }

  async handleEvent(event: PluginEvent): Promise<void> {
    if (event.source !== 'claude') return;

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
    await this.audio.speak(event.message);
  }

  private async handleStop(event: StopEvent): Promise<void> {
    // Log the stop event
    this.logger.info(
      `Stop event received - session: ${event.session_id}, exitCode: ${event.exitCode}, transcript: ${event.transcript_path ? 'yes' : 'no'}`
    );

    // Extract chat if transcript path is provided
    if (event.transcript_path) {
      try {
        const chatData = extractAndSaveChat(event.transcript_path);
        if (chatData && chatData.length > 0) {
          this.logger.info(`Chat extracted successfully: ${chatData.length} messages`);

          // Log a sample of the chat content (first and last messages)
          const firstMsg = chatData[0];
          const lastMsg = chatData[chatData.length - 1];
          this.logger.debug(
            `Chat sample - first: "${firstMsg?.content ? firstMsg.content.toString().substring(0, 50) + '...' : 'No content'}", last: "${lastMsg?.content ? lastMsg.content.toString().substring(0, 50) + '...' : 'No content'}"`
          );
        }
      } catch (error) {
        this.logger.debug(
          `Failed to extract chat: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

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
    // Log the subagent stop event
    this.logger.info(
      `SubagentStop event - agent: ${event.agentId}, task: ${event.taskDescription || 'none'}, success: ${event.success}, duration: ${event.duration}ms`
    );

    // Extract chat if transcript path is provided
    if (event.transcript_path) {
      try {
        const chatData = extractAndSaveChat(event.transcript_path);
        if (chatData && chatData.length > 0) {
          this.logger.info(`Subagent chat extracted: ${chatData.length} messages`);

          // Log task-specific chat content
          const taskRelatedMessages = chatData.filter(
            (msg) =>
              msg.content &&
              event.taskDescription &&
              msg.content.toString().toLowerCase().includes(event.taskDescription.toLowerCase())
          );

          this.logger.debug(
            `Subagent chat - task: "${event.taskDescription || 'none'}", task-related: ${taskRelatedMessages.length}/${chatData.length} messages`
          );
        }
      } catch (error) {
        this.logger.debug(
          `Failed to extract chat: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    let emotion: Emotion;
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
      if (event.reason.toLowerCase().includes('success')) {
        emotion = 'cheerful';
      } else if (
        event.reason.toLowerCase().includes('error') ||
        event.reason.toLowerCase().includes('fail')
      ) {
        emotion = 'disappointed';
        message = 'Agent task encountered an issue';
      } else {
        emotion = 'neutral';
      }
    } else {
      emotion = 'cheerful';
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

  isAvailable(): boolean {
    // Check if we're in a Claude environment
    // This could check for specific env vars or config files
    return true;
  }
}
