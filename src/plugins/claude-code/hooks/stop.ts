#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';
import { promises as fs } from 'fs';
import * as path from 'path';

class StopHook extends ClaudeCodeHook {
  protected eventType = 'stop';

  async run(): Promise<void> {
    try {
      const input = await this.readStdin();
      const data = this.parseInput(input);

      if (data) {
        // Handle --chat flag
        if (process.argv.includes('--chat') && data.transcript_path) {
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

      // Create logs directory if it doesn't exist
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logsDir, { recursive: true });

      // Write to logs/chat.json
      const chatFile = path.join(logsDir, 'chat.json');
      await fs.writeFile(chatFile, JSON.stringify(chatData, null, 2));
    } catch (error) {
      // Fail silently
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
