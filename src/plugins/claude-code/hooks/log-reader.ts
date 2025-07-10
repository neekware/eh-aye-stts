import { promises as fs } from 'fs';
import { join } from 'path';
import { LOGS_DIR } from '../../../defaults';
import { getProjectName } from '../../../utils/project';
import { HookEvent } from '../../../types';
import { PostToolUseEvent } from '../types';
import { SessionSummary } from './context-builder';

export class LogReader {
  private static readonly MAX_LOG_LINES = 1000;

  static async loadRecentEvents(count = 5): Promise<HookEvent[]> {
    const projectName = getProjectName();
    const logFiles = [
      'pre-tool-use.json',
      'post-tool-use.json',
      'notification.json',
      'stop.json',
      'subagent-stop.json',
    ];

    const allEvents: HookEvent[] = [];

    for (const logFile of logFiles) {
      const logPath = join(LOGS_DIR, projectName, logFile);
      try {
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        // Parse each line as a separate JSON event
        for (const line of lines.slice(-this.MAX_LOG_LINES)) {
          try {
            const parsed = JSON.parse(line);
            // Convert log format to HookEvent format
            const event: HookEvent = {
              type: parsed.type || parsed.hook || logFile.replace('.json', ''),
              timestamp: parsed.timestamp,
              data: parsed.data || parsed,
            };
            allEvents.push(event);
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // File doesn't exist or can't be read
      }
    }

    // Sort by timestamp and return most recent
    return allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }

  static async getSessionSummary(): Promise<SessionSummary> {
    const events = await this.loadRecentEvents(100);

    // Calculate metrics
    const postToolEvents = events
      .filter((e) => e.type === 'post-tool-use')
      .map((e) => e.data as unknown as PostToolUseEvent);

    const totalCommands = postToolEvents.length;
    const errors = postToolEvents.filter((e) => e.exitCode !== 0).length;
    const successes = postToolEvents.filter((e) => e.exitCode === 0).length;

    // Calculate duration (from first to last event)
    let duration = 0;
    if (events.length > 1) {
      const firstTime = new Date(events[events.length - 1].timestamp).getTime();
      const lastTime = new Date(events[0].timestamp).getTime();
      duration = lastTime - firstTime;
    }

    // Get most used tools
    const toolCounts = new Map<string, number>();
    postToolEvents.forEach((event) => {
      const tool = event.tool;
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    });

    const mostUsedTools = Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tool]) => tool);

    return {
      totalCommands,
      errors,
      successes,
      duration,
      mostUsedTools,
    };
  }

  static async clearOldLogs(daysToKeep = 7): Promise<void> {
    const projectName = getProjectName();
    const logDir = join(LOGS_DIR, projectName);

    try {
      const files = await fs.readdir(logDir);
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(logDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be accessed
    }
  }

  static async getEventCountByType(eventType: string, minutes = 60): Promise<number> {
    const events = await this.loadRecentEvents(1000);
    const cutoffTime = Date.now() - minutes * 60 * 1000;

    return events.filter(
      (e) => e.type === eventType && new Date(e.timestamp).getTime() > cutoffTime
    ).length;
  }
}
