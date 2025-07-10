#!/usr/bin/env node
import { getRegistry } from '../../registry';
import { PluginEvent } from '../../base';

export abstract class ClaudeCodeHook {
  protected abstract eventType: string;

  async run(): Promise<void> {
    try {
      const input = await this.readStdin();
      const data = this.parseInput(input);

      if (!data) {
        console.error('Invalid input data');
        process.exit(2);
      }

      // Create plugin event
      const event: PluginEvent = {
        type: this.eventType,
        source: 'claude-code',
        timestamp: new Date().toISOString(),
        data,
      };

      // Get registry and broadcast event
      const registry = getRegistry();
      registry.initialize();
      await registry.broadcastEvent(event);

      process.exit(0);
    } catch (error) {
      console.error('Hook error:', error);
      process.exit(2);
    }
  }

  protected async readStdin(): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk.toString();
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
    });
  }

  protected parseInput(input: string): Record<string, unknown> | null {
    try {
      const trimmed = input.trim();
      if (!trimmed) return null;
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
