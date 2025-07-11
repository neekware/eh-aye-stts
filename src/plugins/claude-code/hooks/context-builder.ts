import { HookEvent } from '../../../types';
import {
  PostToolUseEvent,
  PreToolUseEvent,
  StopEvent,
  SubagentStopEvent,
  NotificationEvent,
} from '../types';
import { getProjectName } from '../../../utils/project';
import { LogReader } from './log-reader';

export interface HookContext {
  // Core event data
  eventType: string;
  timestamp: string;
  tool?: string;

  // Execution context
  command?: string;
  result?: string;
  exitCode?: number;
  duration?: number;

  // Project context
  projectName: string;
  cwd: string;

  // Aggregated context
  recentEvents?: HookEvent[];
  sessionDuration?: number;
  errorCount?: number;
  successCount?: number;
  mostUsedTools?: string[];
}

export interface SessionSummary {
  totalCommands: number;
  errors: number;
  successes: number;
  duration: number;
  mostUsedTools: string[];
}

export class ContextBuilder {
  private static readonly MAX_CONTEXT_LENGTH = 500; // chars
  private static readonly RECENT_EVENTS_COUNT = 5;

  static async buildContext(event: HookEvent): Promise<HookContext> {
    const context: HookContext = {
      eventType: event.type,
      timestamp: event.timestamp,
      projectName: getProjectName(),
      cwd: process.cwd(),
    };

    // Extract event-specific data
    switch (event.type) {
      case 'pre-tool-use': {
        const preEvent = event.data as unknown as PreToolUseEvent;
        context.tool = preEvent.tool;
        context.command = this.extractCommand(preEvent);
        break;
      }

      case 'post-tool-use': {
        const postEvent = event.data as unknown as PostToolUseEvent;
        context.tool = postEvent.tool;
        context.command = this.extractCommand(postEvent);
        context.result = this.truncateResult(postEvent.result);
        context.exitCode = postEvent.exitCode;
        context.duration = postEvent.duration;
        break;
      }

      case 'stop': {
        const stopEvent = event.data as unknown as StopEvent;
        context.exitCode = stopEvent.exitCode;
        // Load recent events from logs for session summary
        context.recentEvents = await LogReader.loadRecentEvents(this.RECENT_EVENTS_COUNT);
        const summary = await LogReader.getSessionSummary();
        context.sessionDuration = summary.duration;
        context.errorCount = summary.errors;
        context.successCount = summary.successes;
        context.mostUsedTools = summary.mostUsedTools;
        break;
      }

      case 'subagent-stop': {
        const subagentEvent = event.data as unknown as SubagentStopEvent;
        context.duration = subagentEvent.duration;
        context.command = subagentEvent.taskDescription;
        context.exitCode = subagentEvent.success ? 0 : 1;
        break;
      }

      case 'notification': {
        const notificationEvent = event.data as unknown as NotificationEvent;
        context.command = notificationEvent.message;
        break;
      }
    }

    return context;
  }

  private static extractCommand(event: PreToolUseEvent | PostToolUseEvent): string {
    if (typeof event.args === 'string') return event.args;
    if (Array.isArray(event.args)) return event.args.join(' ');
    if (typeof event.args === 'object' && event.args?.command) {
      return String(event.args.command);
    }
    return '';
  }

  private static truncateResult(result: string | Buffer): string {
    const str = typeof result === 'string' ? result : result.toString();
    if (str.length <= this.MAX_CONTEXT_LENGTH) return str;
    return str.substring(0, this.MAX_CONTEXT_LENGTH) + '...';
  }

  static getContextSummary(context: HookContext): string {
    const parts: string[] = [];

    if (context.tool) {
      parts.push(`Tool: ${context.tool}`);
    }

    if (context.command) {
      const cmd =
        context.command.length > 50 ? context.command.substring(0, 50) + '...' : context.command;
      parts.push(`Command: ${cmd}`);
    }

    if (context.exitCode !== undefined) {
      parts.push(`Status: ${context.exitCode === 0 ? 'Success' : 'Failed'}`);
    }

    if (context.duration) {
      const seconds = Math.round(context.duration / 1000);
      parts.push(`Duration: ${seconds}s`);
    }

    // Include result summary for documentation updates
    if (context.result && context.tool === 'MultiEdit' && context.command?.includes('doc')) {
      const resultSummary = context.result.substring(0, 100);
      parts.push(`Result: ${resultSummary}`);
    }

    if (context.errorCount !== undefined && context.successCount !== undefined) {
      parts.push(`Session: ${context.successCount} successes, ${context.errorCount} errors`);
    }

    return parts.join(', ');
  }
}
