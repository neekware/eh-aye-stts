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
    .option('--workspace', 'Remove wrapper scripts from .claude/hooks/')
    .option('--local', 'Remove local settings from .claude/settings.local.json')
    .addHelpText(
      'after',
      `
Examples:
  stts disable claude-code --workspace  Remove TTS hooks + workspace wrapper
  stts disable claude-code --local      Remove TTS hooks + local settings

Note: You must specify either --workspace or --local
Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(async (tool: string, options: { workspace?: boolean; local?: boolean }) => {
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

      // Require either --workspace or --local
      if (!options.workspace && !options.local) {
        console.error(chalk.red('Error: You must specify either --workspace or --local'));
        console.error(chalk.yellow('\nUse --workspace for team settings (tracked in git)'));
        console.error(chalk.yellow('Use --local for personal settings (not tracked in git)'));
        process.exit(1);
      }

      if (options.workspace && options.local) {
        console.error(chalk.red('Cannot specify both --workspace and --local flags'));
        process.exit(1);
      }

      let actualSettingsPath: string;
      if (options.workspace) {
        // Use workspace settings (tracked in git)
        actualSettingsPath = join(process.cwd(), CLAUDE_DIR, CLAUDE_SETTINGS_FILE);
      } else {
        // Use local settings (not tracked in git)
        actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');
      }

      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        await manager.removeHooks();

        // Always remove local wrappers (no global removal)
        await manager.removeLocalWrappers();

        console.log(chalk.green('\n✓ TTS hooks removed successfully'));

        console.log(chalk.blue(`\n📁 Settings updated: ${actualSettingsPath}`));
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
