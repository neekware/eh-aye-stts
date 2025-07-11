import { writeFileSync, appendFileSync } from 'fs';
import { getProjectName } from './project';
import { getConfigValue } from './config';
import { SessionManager } from './session-manager';

export interface DebugLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  event: string;
  data?: unknown;
  message?: string;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logPath: string;
  private projectName: string;

  private constructor() {
    this.projectName = getProjectName();
    SessionManager.ensureSessionDirectories();
    this.logPath = SessionManager.getSessionLogFile('debug.log');

    // Initialize log file with header using atomic operation
    try {
      const inClaudeSession = SessionManager.isInClaudeSession();
      writeFileSync(
        this.logPath,
        `=== STTS Debug Log ===\nProject: ${this.projectName}\nIn Claude Session: ${inClaudeSession}\nStarted: ${new Date().toISOString()}\n\n`,
        { flag: 'wx' } // 'wx' flag creates file only if it doesn't exist (atomic)
      );
    } catch (error) {
      // File already exists, which is fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private formatEntry(entry: DebugLogEntry): string {
    const { timestamp, level, component, event, data, message } = entry;
    let line = `[${timestamp}] [${level.toUpperCase()}] [${component}] ${event}`;

    if (message) {
      line += `: ${message}`;
    }

    if (data) {
      line += `\n  Data: ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}`;
    }

    return line + '\n';
  }

  log(entry: Omit<DebugLogEntry, 'timestamp'>): void {
    // Check both config and environment variable
    const debugEnabled =
      getConfigValue('debug', false) || process.env.DEBUG === 'true' || process.env.DEBUG === '1';
    if (!debugEnabled) return;

    const fullEntry: DebugLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    try {
      appendFileSync(this.logPath, this.formatEntry(fullEntry));
    } catch (error) {
      // Silently fail if we can't write to log
      console.error('Debug log write failed:', error);
    }
  }

  debug(component: string, event: string, message?: string, data?: unknown): void {
    this.log({ level: 'debug', component, event, message, data });
  }

  info(component: string, event: string, message?: string, data?: unknown): void {
    this.log({ level: 'info', component, event, message, data });
  }

  warn(component: string, event: string, message?: string, data?: unknown): void {
    this.log({ level: 'warn', component, event, message, data });
  }

  error(component: string, event: string, message?: string, data?: unknown): void {
    this.log({ level: 'error', component, event, message, data });
  }

  // Convenience method for LLM-specific logging
  llm(event: string, data?: unknown): void {
    this.debug('LLM', event, undefined, data);
  }

  // Convenience method for cache-specific logging
  cache(event: string, data?: unknown): void {
    this.debug('Cache', event, undefined, data);
  }

  // Convenience method for hook-specific logging
  hook(hookName: string, event: string, data?: unknown): void {
    this.debug(`Hook:${hookName}`, event, undefined, data);
  }

  // Get the log file path
  getLogPath(): string {
    return this.logPath;
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();
