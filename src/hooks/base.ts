import { HookEvent } from '../types';
import winston from 'winston';
import { join } from 'path';
import { promises as fs, mkdirSync, appendFileSync } from 'fs';
import { LOGS_DIR } from '../defaults';

export abstract class BaseHook {
  protected logger: winston.Logger;
  protected jsonLogger: winston.Logger;
  protected projectName: string;

  constructor(protected hookName: string) {
    this.projectName = this.extractProjectName();
    this.logger = this.createLogger();
    this.jsonLogger = this.createJsonLogger();
  }

  private extractProjectName(): string {
    const cwd = process.cwd();
    const pathParts = cwd.split('/').filter((part) => part.length > 0);
    return pathParts[pathParts.length - 1] || 'default';
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

  private createJsonLogger(): winston.Logger {
    const projectLogDir = join(LOGS_DIR, this.projectName);
    const logFile = join(projectLogDir, 'hook.log');

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
          const projectLogDir = join(LOGS_DIR, this.projectName);
          const debugLog = join(projectLogDir, 'claude-hook-debug.log');
          const timestamp = new Date().toISOString();
          const logEntry = `[${timestamp}] ${this.hookName} stdin data: ${trimmedData || '(empty)'}\n`;
          mkdirSync(projectLogDir, { recursive: true });
          appendFileSync(debugLog, logEntry);
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

  protected async ensureLogDirectory(): Promise<void> {
    const projectLogDir = join(LOGS_DIR, this.projectName);
    await fs.mkdir(projectLogDir, { recursive: true });
  }

  abstract execute(): Promise<void>;

  async run(): Promise<void> {
    try {
      await this.ensureLogDirectory();
      await this.execute();
      process.exit(0);
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
      process.exit(1);
    }
  }
}
