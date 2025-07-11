#!/usr/bin/env node
import { Command } from 'commander';
import { VERSION } from '../utils/version';
import { enableCommand } from './commands/enable';
import { disableCommand } from './commands/disable';
import { statusCommand } from './commands/status';
import { testCommand } from './commands/test';
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
  stts enable claude-code                Enable TTS hooks for Claude Code
  stts disable claude-code               Disable TTS hooks for Claude Code
  stts status claude-code                Check TTS status for Claude Code
  stts test                              Test TTS functionality
  stts hook <type>                       Run specific hook manually

Use 'stts <command> --help' for detailed command information.`
    );

  // Add commands
  program.addCommand(enableCommand());
  program.addCommand(disableCommand());
  program.addCommand(statusCommand());
  program.addCommand(testCommand());
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
