import { Command } from 'commander';
import chalk from 'chalk';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function disableCommand(): Command {
  return new Command('disable')
    .description('Disable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to disable TTS for (currently supports: claude-code, claude)')
    .option('--global', 'Remove wrapper scripts from ~/.stts/hooks/')
    .option('--local', 'Remove wrapper scripts from .claude/hooks/')
    .addHelpText(
      'after',
      `
Examples:
  stts disable claude-code           Remove TTS hooks
  stts disable claude-code --global  Remove global wrapper script
  stts disable claude-code --local   Remove local wrapper script

Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(async (tool: string, options: { global?: boolean; local?: boolean }) => {
      const detector = new ToolDetector();
      const settingsPath = await detector.getSettingsPath(tool);

      if (!settingsPath) {
        console.error(chalk.red('Could not find settings file'));
        process.exit(1);
      }

      console.log(chalk.blue(`🔇 Disabling TTS for ${tool}...\n`));

      const manager = new SettingsManager(settingsPath, tool);

      try {
        await manager.removeHooks();

        // Remove wrapper scripts if requested
        if (options.global && options.local) {
          console.error(chalk.red('Cannot specify both --global and --local flags'));
          process.exit(1);
        }

        if (options.global) {
          await manager.removeGlobalWrappers();
        } else if (options.local) {
          await manager.removeLocalWrappers();
        }

        console.log(chalk.green('\n✓ TTS hooks removed successfully'));
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to remove hooks: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });
}
