#!/usr/bin/env node
import { Command } from 'commander';
import { VERSION } from '../utils/version';
import { enableCommand } from './commands/enable';
import { disableCommand } from './commands/disable';
import { statusCommand } from './commands/status';
import { testCommand } from './commands/test';
import { claudeCommand } from './commands/claude';
import { sayCommand } from './commands/say';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('stts')
    .description('Smart Text-to-Speech installer for development tools with wrapper script support')
    .version(VERSION)
    .addHelpText(
      'after',
      `Examples:
          stts claude enable    Enable TTS hooks for Claude
          stts claude disable   Disable TTS hooks for Claude
          stts claude status    Check TTS status for Claude
          stts test             Test TTS functionality
          
       Use 'stts <command> --help' for detailed command information.`
    );

  // Add commands
  program.addCommand(claudeCommand());
  program.addCommand(enableCommand());
  program.addCommand(disableCommand());
  program.addCommand(statusCommand());
  program.addCommand(testCommand());
  program.addCommand(sayCommand());

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
