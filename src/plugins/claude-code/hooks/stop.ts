#!/usr/bin/env node
import { BaseHook } from './base';
import { StopEvent } from '../types';
import { Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';
import { ContextBuilder, HookContext } from './context-builder';
import { LLMFeedbackGenerator } from '../../../services/llm-feedback';
import { getConfigValue } from '../../../utils/config';
import { TranscriptParser } from '../../../services/transcript-parser';
import { debugLogger } from '../../../utils/debug-logger';

export class StopHook extends BaseHook {
  constructor() {
    super('stop');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

    const event = this.parseInput(input) as StopEvent;

    debugLogger.hook('stop', 'execute', { event });

    // Log the stop event
    this.logEvent({
      type: 'stop',
      timestamp: new Date().toISOString(),
      data: { ...(event || {}) },
    });

    // Build context with session summary
    const context = await ContextBuilder.buildContext({
      type: 'stop',
      timestamp: new Date().toISOString(),
      data: (event || {}) as Record<string, unknown>,
    });

    // If we have a transcript, extract the last assistant message
    if (event?.transcript_path) {
      debugLogger.info(
        'stop',
        'transcript_found',
        `Processing transcript: ${event.transcript_path}`
      );

      const lastMessage = TranscriptParser.getLastAssistantMessage(event.transcript_path);
      if (lastMessage) {
        // Add the last assistant message to context
        context.command = lastMessage;
        debugLogger.info('stop', 'assistant_message_extracted', undefined, {
          messageLength: lastMessage.length,
          preview: lastMessage.substring(0, 200) + (lastMessage.length > 200 ? '...' : ''),
          fullMessage: lastMessage, // Log full message in debug mode
        });
      }

      // Get session stats for better context
      const stats = TranscriptParser.getSessionStats(event.transcript_path);
      if (stats.messageCount > 0) {
        context.sessionDuration = stats.duration;
        context.errorCount = stats.hasErrors ? 1 : 0;
        debugLogger.info('stop', 'session_stats', undefined, stats);
      }
    }

    // Generate session summary message
    const message = await this.generateMessage(context, event);
    const emotion = this.determineEmotion(context, event);

    debugLogger.info('stop', 'generated_message', message, { emotion });

    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      debugLogger.error(
        'stop',
        'tts_error',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async generateMessage(context: HookContext, _event: StopEvent | null): Promise<string> {
    const llmEnabled = getConfigValue('llmEnabled', true);

    if (!llmEnabled) {
      return this.getStaticMessage();
    }

    // Use special session summary method if we have session data
    if (context.sessionDuration || context.errorCount !== undefined) {
      return await LLMFeedbackGenerator.generateSessionSummary(context);
    }

    return await LLMFeedbackGenerator.generateFeedback(context, {
      maxWords: getConfigValue('llmMaxWords', 10),
      style: getConfigValue('llmStyle', 'casual') as 'casual' | 'professional' | 'encouraging',
    });
  }

  private getStaticMessage(): string {
    const messages = ['Session completed', 'Task finished', 'Work complete', 'All done'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private determineEmotion(context: HookContext, event: StopEvent | null): Emotion {
    // Check session summary for errors
    if (context.errorCount && context.errorCount > 0) {
      return 'concerned';
    }

    // Check exit code
    if (event?.exitCode === 0 || !event?.exitCode) {
      return 'cheerful';
    } else if (event?.exitCode !== 0) {
      return 'concerned';
    }

    return 'neutral';
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
