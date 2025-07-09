#!/usr/bin/env node
import { BaseHook } from './base.js';
import { PreToolUseEvent } from '../types.js';
import { loadTTS } from '../tts/index.js';

export class PreToolUseHook extends BaseHook {
  private tts = loadTTS();
  private dangerousCommands = [
    'rm -rf',
    'dd if=',
    ':(){:|:&};:',  // Fork bomb
    'mkfs',
    'format',
    '> /dev/sda',
    'chmod -R 777 /',
    'chown -R',
  ];

  constructor() {
    super('pre-tool-use');
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
      data: event
    });

    // Check for dangerous commands
    if (event.tool === 'bash' || event.tool === 'shell') {
      const command = event.args?.command || '';
      
      if (this.isDangerousCommand(command)) {
        this.logger.error(`Blocked dangerous command: ${command}`);
        
        // Announce the block
        await this.announce(`Warning: Blocked dangerous command`);
        
        // Exit with code 2 to indicate blocked operation
        process.exit(2);
      }
    }

    // Announce tool usage
    const toolName = this.getToolDisplayName(event.tool);
    await this.announce(`Running ${toolName}`);
  }

  private isDangerousCommand(command: string): boolean {
    const lowerCommand = command.toLowerCase();
    return this.dangerousCommands.some(dangerous => 
      lowerCommand.includes(dangerous.toLowerCase())
    );
  }

  private getToolDisplayName(tool: string): string {
    const displayNames: Record<string, string> = {
      'bash': 'bash command',
      'shell': 'shell command',
      'read': 'file reader',
      'write': 'file writer',
      'search': 'search tool',
      'grep': 'grep search',
      'find': 'find command'
    };
    
    return displayNames[tool.toLowerCase()] || tool;
  }

  private async announce(message: string): Promise<void> {
    try {
      const success = await this.tts.speak(message);
      if (!success) {
        this.logger.warn('Failed to announce message');
      }
    } catch (error) {
      this.logger.error(`TTS error: ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PreToolUseHook();
  hook.run();
}