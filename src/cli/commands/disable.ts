import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR } from '../../defaults';
import { SettingsManager } from '../../installer/settings-manager';

export function disableCommand(): Command {
  return new Command('disable')
    .description('Disable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to disable TTS for (currently supports: claude)')
    .addHelpText(
      'after',
      `
Examples:
  stts disable claude              Remove TTS hooks from local settings

Note: Removes hooks from .claude/settings.local.json
Supported tools: claude`
    )
    .showHelpAfterError()
    .action(async (tool: string) => {
      // Validate tool parameter
      const supportedTools = ['claude'];
      if (!supportedTools.includes(tool.toLowerCase())) {
        console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
        console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
        console.error(chalk.gray(`\nUse 'stts disable --help' for more information`));
        process.exit(1);
      }

      console.log(chalk.blue(`🔇 Disabling TTS for ${tool}...\n`));

      // Always use local settings (not tracked in git)
      const actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');

      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        await manager.removeHooks();

        // Note: We don't remove the global wrapper or audio command
        // as they might be used by other projects

        console.log(chalk.green('\n✓ TTS hooks removed successfully'));

        console.log(chalk.blue(`\n📁 Settings updated: ${actualSettingsPath}`));

        console.log(chalk.yellow('\n⚠️  Please restart Claude for these changes to take effect.'));
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
