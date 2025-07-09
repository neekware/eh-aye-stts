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

export function createProgram(): Command {
  const program = new Command();

  program
    .name('stts')
    .description('Smart Text-to-Speech installer for development tools')
    .version(VERSION);

  // Add commands
  program.addCommand(detectCommand());
  program.addCommand(enableCommand());
  program.addCommand(disableCommand());
  program.addCommand(statusCommand());
  program.addCommand(configCommand());
  program.addCommand(testCommand());
  program.addCommand(restoreCommand());

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
