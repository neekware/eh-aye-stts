#!/usr/bin/env node
import { BaseHook } from './base';
import { PreToolUseEvent } from '../types';
import { announceIfEnabled } from '../../../tts/announce';

export class PreToolUseHook extends BaseHook {
  constructor() {
    super('pre-tool-use');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

    const event = this.parseInput(input) as PreToolUseEvent;

    if (!event) {
      this.logger.warn('Invalid pre-tool-use event');
      return;
    }

    // Log the event
    this.logEvent({
      type: 'pre-tool-use',
      timestamp: new Date().toISOString(),
      data: { ...event },
    });

    // No dangerous command blocking - removed per requirements

    // Announce tool usage
    const toolName = this.getToolDisplayName(event.tool);
    await announceIfEnabled(`Running ${toolName}`);
  }

  private getToolDisplayName(tool: string): string {
    const displayNames: Record<string, string> = {
      bash: 'bash command',
      shell: 'shell command',
      read: 'file reader',
      write: 'file writer',
      search: 'search tool',
      grep: 'grep search',
      find: 'find command',
    };

    return displayNames[tool.toLowerCase()] || tool;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PreToolUseHook();
  void hook.run();
}
