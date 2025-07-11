import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR, CLAUDE_SETTINGS_FILE } from '../../defaults';
import { SettingsManager } from '../../installer/settings-manager';

export function enableCommand(): Command {
  const cmd = new Command('enable')
    .description('Enable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to enable TTS for (currently supports: claude-code, claude)')
    .option('--no-audio', 'Disable audio announcements')
    .option(
      '--workspace',
      'Install wrapper scripts in workspace in .claude/hooks/ (silent if stts missing)'
    )
    .option('--local', 'Install settings in local .claude/settings.local.json (not tracked by git)')
    .addHelpText(
      'after',
      `
Examples:
  stts enable claude-code --workspace    Enable TTS hooks with workspace wrapper
  stts enable claude-code --local        Enable TTS hooks with local settings (not in git)
  stts enable claude-code --workspace --no-audio    Enable without audio announcements

Note: You must specify either --workspace or --local
Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(
      async (
        tool: string,
        options: {
          audio?: boolean;
          workspace?: boolean;
          local?: boolean;
        }
      ) => {
        // Validate tool parameter
        const supportedTools = ['claude', 'claude-code'];
        if (!supportedTools.includes(tool.toLowerCase())) {
          console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
          console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
          console.error(chalk.gray(`\nUse 'stts enable --help' for more information`));
          process.exit(1);
        }

        console.log(chalk.blue(`📦 Enabling TTS for ${tool}...\n`));

        // Settings path will be determined by workspace/local flag

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

        let wrapperType: 'local';
        let actualSettingsPath: string;

        if (options.workspace) {
          // Use workspace settings (tracked in git)
          wrapperType = 'local';
          actualSettingsPath = join(process.cwd(), CLAUDE_DIR, CLAUDE_SETTINGS_FILE);
        } else {
          // Use local settings (not tracked in git)
          wrapperType = 'local';
          actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');
        }

        // Create manager with appropriate settings path
        const manager = new SettingsManager(actualSettingsPath, tool);

        try {
          // Always install local wrappers (no global installation)
          await manager.installLocalWrappers();

          // Install hooks with appropriate wrapper type
          await manager.installHooks(wrapperType);

          console.log(chalk.green('\n✨ TTS hooks installed successfully!'));

          if (options.workspace) {
            console.log(chalk.blue(`\n📁 Workspace settings updated: ${actualSettingsPath}`));
            console.log(chalk.gray('   (These settings apply to this project only)'));
          } else {
            console.log(chalk.blue(`\n📁 User settings updated: ${actualSettingsPath}`));
            console.log(chalk.gray('   (These settings apply to all projects)'));
          }

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
      }
    );

  return cmd;
}
