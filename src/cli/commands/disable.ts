import { Command } from 'commander';
import chalk from 'chalk';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function disableCommand(): Command {
  return new Command('disable')
    .description('Disable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to disable TTS for (currently supports: claude-code, claude)')
    .option('--user', 'Remove wrapper scripts from ~/.stts/hooks/')
    .option('--workspace', 'Remove wrapper scripts from .claude/hooks/')
    .addHelpText(
      'after',
      `
Examples:
  stts disable claude-code           Remove TTS hooks + user wrapper (default)
  stts disable claude-code --user    Same as above (explicit user wrapper)
  stts disable claude-code --workspace  Remove TTS hooks + workspace wrapper

Note: By default, removes wrapper scripts from ~/.stts/hooks/
Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(async (tool: string, options: { user?: boolean; workspace?: boolean }) => {
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

        // Remove wrapper scripts
        if (options.user && options.workspace) {
          console.error(chalk.red('Cannot specify both --user and --workspace flags'));
          process.exit(1);
        }

        if (options.workspace) {
          // If --workspace is explicitly specified, remove local wrapper
          await manager.removeLocalWrappers();
        } else {
          // Default behavior (no flag or --user): remove global wrapper
          await manager.removeGlobalWrappers();
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
