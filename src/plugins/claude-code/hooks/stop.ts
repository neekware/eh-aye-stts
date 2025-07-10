#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';
import { promises as fs, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { LOGS_DIR } from '../../../defaults';
import { getProjectName } from '../../../utils/project';

class StopHook extends ClaudeCodeHook {
  protected eventType = 'stop';

  async run(): Promise<void> {
    try {
      const input = await this.readStdin();
      const data = this.parseInput(input);

      if (data) {
        // Always export chat if transcript_path is provided
        if (data.transcript_path) {
          await this.exportChat(data.transcript_path as string);
        }

        // Continue with normal event processing
        await super.run();
      } else {
        console.error('Invalid input data');
      }
    } catch (error) {
      console.error('Hook error:', error);
    }
    process.exit(0);
  }

  private async exportChat(transcriptPath: string): Promise<void> {
    try {
      // Check if transcript exists
      await fs.access(transcriptPath);

      // Read transcript (JSONL format)
      const content = await fs.readFile(transcriptPath, 'utf-8');
      const chatData: any[] = [];

      // Parse each line as JSON
      for (const line of content.trim().split('\n')) {
        if (line) {
          try {
            chatData.push(JSON.parse(line));
          } catch {
            // Skip invalid lines
          }
        }
      }

      const projectName = getProjectName();
      const projectLogDir = join(LOGS_DIR, projectName);
      await fs.mkdir(projectLogDir, { recursive: true });
      const logFile = join(projectLogDir, 'chat.json');
      await fs.writeFile(logFile, JSON.stringify(chatData, null, 2));

      this.debugLog(`Chat log exported to: ${logFile}`);
    } catch (error) {
      this.debugLog(
        `Failed to export chat: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private debugLog(message: string): void {
    try {
      const projectName = getProjectName();
      const projectLogDir = join(LOGS_DIR, projectName);
      const debugLog = join(projectLogDir, 'claude-hook-debug.json');
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        hook: 'StopHook',
        message,
      };

      mkdirSync(projectLogDir, { recursive: true });

      // Read existing logs or create new array
      let logs: any[] = [];
      if (existsSync(debugLog)) {
        try {
          const content = readFileSync(debugLog, 'utf-8');
          logs = JSON.parse(content);
        } catch {
          logs = [];
        }
      }

      // Append new entry and write back
      logs.push(logEntry);
      writeFileSync(debugLog, JSON.stringify(logs, null, 2));
    } catch {
      // Ignore logging errors
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
