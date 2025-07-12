import { HookEvent } from '../../../types';
import winston from 'winston';
import { readFileSync, writeFileSync } from 'fs';
import { getProjectName } from '../../../utils/project';
import { SessionManager } from '../../../utils/session';

export abstract class BaseHook {
  protected logger: winston.Logger;
  protected jsonLogger: winston.Logger;
  protected projectName: string;

  constructor(protected hookName: string) {
    this.projectName = getProjectName();
    this.logger = this.createLogger();
    this.jsonLogger = this.createJsonLogger();
  }

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.DEBUG ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${String(timestamp)}] ${level}: ${String(message)}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          silent: !process.env.DEBUG,
        }),
      ],
    });
  }

  public getLogFileName(customName?: string): string {
    const logFileName = customName ? `${customName}.json` : `${this.hookName}.json`;
    return SessionManager.getSessionLogFile(logFileName);
  }

  private createJsonLogger(): winston.Logger {
    const logFile = this.getLogFileName(this.hookName);

    return winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, message }) => {
          const data = message as HookEvent & { cwd?: string; project?: string };
          return JSON.stringify({
            timestamp,
            hook: this.hookName,
            type: data.type,
            cwd: data.cwd,
            project: data.project,
            data: data.data,
          });
        })
      ),
      transports: [
        new winston.transports.File({
          filename: logFile,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
      ],
    });
  }

  protected async readStdin(): Promise<string> {
    // If stdin is a TTY (terminal), return empty string immediately
    // This prevents hanging when run manually without piped input
    if (process.stdin.isTTY) {
      return '';
    }

    return new Promise((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', (chunk: string) => {
        data += chunk;
      });

      process.stdin.on('end', () => {
        const trimmedData = data.trim();

        // Debug logging for stdin data
        try {
          const debugLog = SessionManager.getSessionLogFile('hook-debug.json');
          const timestamp = new Date().toISOString();
          const logEntry = {
            timestamp,
            hook: this.hookName,
            event: 'stdin_data',
            data: trimmedData || '(empty)',
          };

          SessionManager.ensureSessionDirectories();

          // Read existing logs or create new array
          interface DebugLogEntry {
            timestamp: string;
            hook: string;
            event: string;
            data: string;
          }
          let logs: DebugLogEntry[] = [];
          try {
            const content = readFileSync(debugLog, 'utf-8');
            logs = JSON.parse(content) as DebugLogEntry[];
          } catch {
            // File doesn't exist or is invalid JSON, start with empty array
            logs = [];
          }

          // Append new entry and write back
          logs.push(logEntry);
          writeFileSync(debugLog, JSON.stringify(logs, null, 2));
        } catch (err) {
          // Ignore logging errors
        }

        resolve(trimmedData);
      });
    });
  }

  protected parseInput<T = unknown>(input: string): T | null {
    try {
      return JSON.parse(input) as T;
    } catch (error) {
      this.logger.error(
        `Failed to parse input: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  protected logEvent(event: HookEvent): void {
    const eventWithCwd = {
      ...event,
      cwd: process.cwd(),
      project: this.projectName,
    };
    this.jsonLogger.info(eventWithCwd);
  }

  protected ensureLogDirectory(): void {
    SessionManager.ensureSessionDirectories();
  }

  abstract execute(): Promise<void>;

  async run(): Promise<void> {
    try {
      this.ensureLogDirectory();
      await this.execute();
    } catch (error) {
      this.logger.error(
        `Hook execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logEvent({
        type: 'error',
        timestamp: new Date().toISOString(),
        data: {
          hook: this.hookName,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    process.exit(0);
  }
}
