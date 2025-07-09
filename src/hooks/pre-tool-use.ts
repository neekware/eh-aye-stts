#!/usr/bin/env node
import { BaseHook } from './base';
import { PreToolUseEvent } from '../types';
import { getConfigValue } from '../utils/config';
import { announceIfEnabled } from './utils';

export class PreToolUseHook extends BaseHook {
  private enableDangerousCommandBlocking: boolean;
  private dangerousCommands: string[];

  constructor() {
    super('pre-tool-use');

    // Load configuration
    this.enableDangerousCommandBlocking = getConfigValue('enableDangerousCommandBlocking', false);

    // Default dangerous commands
    const defaultDangerousCommands = [
      'rm -rf',
      'dd if=',
      ':(){:|:&};:',
      'mkfs',
      'format',
      '> /dev/sda',
      'chmod -R 777 /',
      'chown -R',
      // Dangerous git commands
      'git push --force',
      'git push -f',
      'git reset --hard',
      'git clean -fdx',
      'git reflog expire',
      'git gc --prune=now',
      'git filter-branch',
      'git filter-repo',
    ];

    // Merge with custom dangerous commands from config
    const customCommands = getConfigValue<string[]>('customDangerousCommands', []);
    this.dangerousCommands = [...defaultDangerousCommands, ...customCommands];
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
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

    // Check for dangerous commands only if enabled
    if (this.enableDangerousCommandBlocking && (event.tool === 'bash' || event.tool === 'shell')) {
      // Handle both array and object formats
      const command = Array.isArray(event.args)
        ? event.args.join(' ')
        : (event.args as { command?: string }).command || '';

      if (this.isDangerousCommand(command)) {
        this.logger.error(`Blocked dangerous command: ${command}`);

        // Announce the block
        await announceIfEnabled(`Warning: Blocked dangerous command`, 'urgent');

        // Exit with code 2 to indicate blocked operation
        process.exit(2);
      }
    }

    // Announce tool usage
    const toolName = this.getToolDisplayName(event.tool);
    await announceIfEnabled(`Running ${toolName}`);
  }

  private isDangerousCommand(command: string): boolean {
    const lowerCommand = command.toLowerCase();
    return this.dangerousCommands.some((dangerous) =>
      lowerCommand.includes(dangerous.toLowerCase())
    );
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
