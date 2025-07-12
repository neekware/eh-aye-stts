import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR } from '../../defaults';
import { SettingsManager } from '../../installer/settings-manager';

export function enableCommand(): Command {
  const cmd = new Command('enable')
    .description('Enable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to enable TTS for (currently supports: claude)')
    .addHelpText(
      'after',
      `Examples:
       stts enable claude Enable TTS hooks
       
       Note: Hooks are installed in .claude/settings.local.json (not tracked by git)
       Supported tools: claude`
    )
    .showHelpAfterError()
    .action(async (tool: string, _options: Record<string, unknown>) => {
      // Validate tool parameter
      const supportedTools = ['claude'];
      if (!supportedTools.includes(tool.toLowerCase())) {
        console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
        console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
        console.error(chalk.gray(`\nUse 'stts enable --help' for more information`));
        process.exit(1);
      }

      console.log(chalk.blue(`📦 Enabling TTS for ${tool}...\n`));

      // Always use local settings (not tracked in git)
      const actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');

      // Create manager with appropriate settings path
      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        // Install hooks in settings.local.json
        await manager.installHooks();

        console.log(chalk.green('\n✨ TTS hooks installed successfully!'));

        console.log(chalk.blue(`\n📁 Local settings updated: ${actualSettingsPath}`));
        console.log(chalk.gray('   (These settings are not tracked by git)'));

        console.log(chalk.gray(`\nHooks will be triggered on:`));
        console.log(chalk.gray('  • Tool usage announcements'));
        console.log(chalk.gray('  • Notifications'));
        console.log(chalk.gray('  • Session completion'));

        console.log(chalk.blue('\n💡 Next steps:'));
        console.log(chalk.gray('  • Test TTS: stts test'));
        console.log(chalk.gray('  • Run your Claude tool and listen for announcements'));
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to install hooks: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });

  return cmd;
}
