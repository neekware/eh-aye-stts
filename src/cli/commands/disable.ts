import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR, CLAUDE_SETTINGS_FILE } from '../../defaults';
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
      // Validate tool parameter
      const supportedTools = ['claude', 'claude-code'];
      if (!supportedTools.includes(tool.toLowerCase())) {
        console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
        console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
        console.error(chalk.gray(`\nUse 'stts disable --help' for more information`));
        process.exit(1);
      }

      const detector = new ToolDetector();
      const settingsPath = await detector.getSettingsPath(tool);

      if (!settingsPath) {
        console.error(chalk.red(`Could not find settings for '${tool}'`));
        console.error(
          chalk.yellow(`\nMake sure ${tool} is installed and has been run at least once.`)
        );
        process.exit(1);
      }

      console.log(chalk.blue(`🔇 Disabling TTS for ${tool}...\n`));

      // Determine which settings file to use
      if (options.user && options.workspace) {
        console.error(chalk.red('Cannot specify both --user and --workspace flags'));
        process.exit(1);
      }

      let actualSettingsPath = settingsPath;
      if (options.workspace) {
        // If --workspace is explicitly specified, use workspace settings
        const workspaceSettingsPath = join(process.cwd(), CLAUDE_DIR, CLAUDE_SETTINGS_FILE);
        actualSettingsPath = workspaceSettingsPath;
      }

      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        await manager.removeHooks();

        // Remove wrapper scripts
        if (options.workspace) {
          // If --workspace is explicitly specified, remove local wrapper
          await manager.removeLocalWrappers();
        } else {
          // Default behavior (no flag or --user): remove global wrapper
          await manager.removeGlobalWrappers();
        }

        console.log(chalk.green('\n✓ TTS hooks removed successfully'));

        if (options.workspace) {
          console.log(chalk.blue(`\n📁 Workspace settings updated: ${actualSettingsPath}`));
        } else {
          console.log(chalk.blue(`\n📁 User settings updated: ${actualSettingsPath}`));
        }
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
