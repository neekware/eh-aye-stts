#!/usr/bin/env node
import { BaseHook } from './base';
import { StopEvent } from '../types';
import { Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';
import { ContextBuilder, HookContext } from './context-builder';
import { LLMFeedbackGenerator } from '../../../services/llm-feedback';
import { getConfigValue } from '../../../utils/config';

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

    // Generate session summary message
    const message = await this.generateMessage(context, event);
    const emotion = this.determineEmotion(context, event);

    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
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
