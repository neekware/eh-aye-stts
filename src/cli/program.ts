#!/usr/bin/env node
import { Command } from 'commander';
import { VERSION } from '../utils/version';
import { detectCommand } from './commands/detect';
import { enableCommand } from './commands/enable';
import { disableCommand } from './commands/disable';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';
import { testCommand } from './commands/test';
import { restoreCommand } from './commands/restore';
import { hookCommand } from './commands/hook';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('stts')
    .description('Smart Text-to-Speech installer for development tools with wrapper script support')
    .version(VERSION)
    .addHelpText(
      'after',
      `
Examples:
  stts enable claude-code     Enable TTS hooks for Claude Code
  stts disable claude-code    Disable TTS hooks for Claude Code
  stts status                 Show current status
  stts test                   Test TTS functionality

Use 'stts <command> --help' for detailed command information.`
    );

  // Add commands
  program.addCommand(detectCommand());
  program.addCommand(enableCommand());
  program.addCommand(disableCommand());
  program.addCommand(statusCommand());
  program.addCommand(configCommand());
  program.addCommand(testCommand());
  program.addCommand(restoreCommand());
  program.addCommand(hookCommand());

  // Handle uncaught errors
  process.on('unhandledRejection', (error) => {
    console.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

  return program;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram().parse();
}
