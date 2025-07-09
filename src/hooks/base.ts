import { HookEvent } from '../types';
import winston from 'winston';
import { join } from 'path';
import { homedir } from 'os';
import { promises as fs } from 'fs';

export abstract class BaseHook {
  protected logger: winston.Logger;
  protected jsonLogger: winston.Logger;

  constructor(protected hookName: string) {
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

  private createJsonLogger(): winston.Logger {
    const logDir = join(homedir(), '.stts', 'logs');
    const logFile = join(logDir, `${this.hookName}.json`);

    return winston.createLogger({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
    return new Promise((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', (chunk: string) => {
        data += chunk;
      });

      process.stdin.on('end', () => {
        resolve(data.trim());
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
    this.jsonLogger.info(event);
  }

  protected async ensureLogDirectory(): Promise<void> {
    const logDir = join(homedir(), '.stts', 'logs');
    await fs.mkdir(logDir, { recursive: true });
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
