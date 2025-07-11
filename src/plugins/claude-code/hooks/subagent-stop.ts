#!/usr/bin/env node
import { BaseHook } from './base';
import { SubagentStopEvent } from '../types';
import { detectEmotion, Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';
import { ContextBuilder, HookContext } from './context-builder';
import { LLMFeedbackGenerator } from '../../../services/llm-feedback';
import { getConfigValue } from '../../../utils/config';

interface PendingSubagent {
  event: SubagentStopEvent;
  context: HookContext;
  timestamp: number;
}

export class SubagentStopHook extends BaseHook {
  private static pendingSubagents: PendingSubagent[] = [];
  private static aggregationTimer: NodeJS.Timeout | null = null;
  private static readonly AGGREGATION_DELAY_MS = 500;

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

    // Build context for LLM
    const context = await ContextBuilder.buildContext({
      type: 'subagent-stop',
      timestamp: new Date().toISOString(),
      data: (event || {}) as Record<string, unknown>,
    });

    // Add to pending subagents
    SubagentStopHook.pendingSubagents.push({
      event,
      context,
      timestamp: Date.now(),
    });

    // Clear existing timer if any
    if (SubagentStopHook.aggregationTimer) {
      clearTimeout(SubagentStopHook.aggregationTimer);
    }

    // Set new timer to process aggregated subagents
    SubagentStopHook.aggregationTimer = setTimeout(() => {
      void this.processAggregatedSubagents();
    }, SubagentStopHook.AGGREGATION_DELAY_MS);
  }

  private async processAggregatedSubagents(): Promise<void> {
    const pending = [...SubagentStopHook.pendingSubagents];
    SubagentStopHook.pendingSubagents = [];
    SubagentStopHook.aggregationTimer = null;

    if (pending.length === 0) {
      return;
    }

    // If only one subagent, announce normally
    if (pending.length === 1) {
      const { event, context } = pending[0];
      const message = await this.generateMessage(context, event);
      const emotion = this.determineEmotion(event);

      try {
        await announceIfEnabled(message, emotion);
      } catch (error) {
        this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    // Multiple subagents - create aggregated message
    const successCount = pending.filter((p) => p.event.success !== false).length;
    const failureCount = pending.length - successCount;
    const aggregationEnabled = getConfigValue('subagentAggregation', true);

    if (!aggregationEnabled) {
      // If aggregation disabled, announce each separately
      for (const { event, context } of pending) {
        const message = await this.generateMessage(context, event);
        const emotion = this.determineEmotion(event);

        try {
          await announceIfEnabled(message, emotion);
        } catch (error) {
          this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return;
    }

    // Create aggregated announcement
    let message: string;
    let emotion: Emotion;

    if (failureCount === 0) {
      message = `${successCount} subagents completed successfully`;
      emotion = 'cheerful';
    } else if (successCount === 0) {
      message = `${failureCount} subagents failed`;
      emotion = 'disappointed';
    } else {
      message = `${successCount} subagents succeeded, ${failureCount} failed`;
      emotion = 'neutral';
    }

    try {
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateMessage(
    context: HookContext,
    event: SubagentStopEvent | null
  ): Promise<string> {
    const llmEnabled = getConfigValue('llmEnabled', true);

    if (!llmEnabled) {
      return this.getStaticMessage(event);
    }

    return await LLMFeedbackGenerator.generateFeedback(context, {
      maxWords: getConfigValue('llmMaxWords', 10),
      style: getConfigValue('llmStyle', 'casual') as 'casual' | 'professional' | 'encouraging',
    });
  }

  private getStaticMessage(event: SubagentStopEvent | null): string {
    if (
      event?.success === false ||
      (event?.reason &&
        (event.reason.toLowerCase().includes('error') ||
          event.reason.toLowerCase().includes('fail')))
    ) {
      return 'Agent task encountered an issue';
    }
    return 'Agent task completed';
  }

  private determineEmotion(event: SubagentStopEvent | null): Emotion {
    if (!event) {
      return 'neutral';
    }

    // Check success flag first
    if (event.success === false) {
      return 'disappointed';
    }

    // Check the reason for more context
    if (event.reason) {
      const reason = event.reason.toLowerCase();
      if (reason.includes('success') || reason.includes('complete')) {
        return 'cheerful';
      } else if (reason.includes('error') || reason.includes('fail')) {
        return 'disappointed';
      }

      // Use emotion detection as fallback
      return detectEmotion(event.reason);
    }

    // Default to cheerful for completed tasks
    return 'cheerful';
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new SubagentStopHook();
  void hook.run();
}
