import { Command } from 'commander';
import { speak } from '../../audio';
import chalk from 'chalk';

export function sayCommand(): Command {
  const cmd = new Command('say')
    .description('Speak text using TTS')
    .argument('<text>', 'Text to speak')
    .action(async (text: string) => {
      try {
        await speak(text);
      } catch (error) {
        console.error(
          chalk.red(`Failed to speak: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });

  return cmd;
}
