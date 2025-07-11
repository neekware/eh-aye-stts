#!/usr/bin/env node
import { BaseHook } from './base';
import { SubagentStopEvent } from '../types';
import { announceIfEnabled } from '../../../tts/announce';

interface PendingSubagent {
  event: SubagentStopEvent;
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

    // Add to pending subagents
    SubagentStopHook.pendingSubagents.push({
      event,
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
      const { event } = pending[0];
      const message = this.getStaticMessage(event);

      try {
        await announceIfEnabled(message);
      } catch (error) {
        this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    // Multiple subagents - create aggregated message
    const successCount = pending.filter((p) => p.event.success !== false).length;
    const failureCount = pending.length - successCount;

    // Create aggregated announcement
    let message: string;

    if (failureCount === 0) {
      message = `${successCount} subagents completed successfully`;
    } else if (successCount === 0) {
      message = `${failureCount} subagents failed`;
    } else {
      message = `${successCount} subagents succeeded, ${failureCount} failed`;
    }

    try {
      await announceIfEnabled(message);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    }
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
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new SubagentStopHook();
  void hook.run();
}
