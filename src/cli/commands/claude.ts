import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR } from '../../defaults';
import { SettingsManager } from '../../installer/settings-manager';
import { execCommand } from '../../utils/platform';
import { existsSync, readFileSync } from 'fs';

interface Hook {
  command?: string;
}

interface HookConfig {
  hooks?: Hook[];
}

interface Settings {
  hooks?: Record<string, HookConfig[]>;
}

export function claudeCommand(): Command {
  const cmd = new Command('claude').description('Manage TTS for Claude tools').addHelpText(
    'after',
    `
Examples:
  stts claude enable     Enable TTS hooks for Claude
  stts claude disable    Disable TTS hooks for Claude
  stts claude status     Check TTS status for Claude`
  );

  // Enable subcommand
  cmd
    .command('enable')
    .description('Enable TTS hooks for Claude')
    .action(async () => {
      const tool = 'claude'; // Default to claude
      console.log(chalk.blue(`📦 Enabling TTS for ${tool}...\n`));

      const actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');
      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        // Ensure Python hooks exist
        await manager.ensurePythonHooks();

        // Install hooks
        await manager.installHooks();

        console.log(chalk.green('\n✨ TTS hooks installed successfully!'));
        console.log(chalk.blue(`\n📁 Local settings updated: ${actualSettingsPath}`));
        console.log(chalk.gray('   (These settings are not tracked by git)'));
        console.log(chalk.gray(`\nHooks will be triggered on:`));
        console.log(chalk.gray('  • Tool usage announcements'));
        console.log(chalk.gray('  • Notifications'));
        console.log(chalk.gray('  • Session completion'));
        console.log(chalk.blue('\n💡 Next steps:'));
        // console.log(chalk.gray('  • Test TTS: stts test'));
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

  // Disable subcommand
  cmd
    .command('disable')
    .description('Disable TTS hooks for Claude')
    .action(async () => {
      const tool = 'claude'; // Default to claude
      console.log(chalk.blue(`🔇 Disabling TTS for ${tool}...\n`));

      const actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');
      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        await manager.removeHooks();
        console.log(chalk.green('✅ TTS hooks removed successfully!'));
        console.log(chalk.blue(`\n📁 Local settings updated: ${actualSettingsPath}`));
        console.log(chalk.gray('   (These settings are not tracked by git)'));

        console.log(chalk.blue('\n💡 To re-enable:'));
        console.log(chalk.gray('  claude: /audio enable, shell: stts claude enable'));
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to remove hooks: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });

  // Status subcommand
  cmd
    .command('status')
    .description('Check TTS status for Claude')
    .action(async () => {
      const tool = 'claude'; // Default to claude
      console.log(chalk.blue(`📊 Checking TTS status for ${tool}...\n`));

      const settingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');

      try {
        if (!existsSync(settingsPath)) {
          console.log(chalk.yellow(`⚠️  No local settings file found`));
          console.log(chalk.gray(`   Expected at: ${settingsPath}`));
          console.log(chalk.blue('\n💡 To enable TTS:'));
          console.log(chalk.gray('  claude: /audio enable, shell: stts claude enable'));
          return;
        }

        const content = readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content) as Settings;
        const hooks = settings.hooks || {};

        const hasHooks = Object.values(hooks).some((hookArray) =>
          Array.isArray(hookArray)
            ? hookArray.some((hook: HookConfig) =>
                hook.hooks?.some((h) => h.command?.includes('.claude/hooks/'))
              )
            : false
        );

        if (hasHooks) {
          console.log(chalk.green('✅ TTS hooks are ENABLED'));
          console.log(chalk.gray(`\n📁 Settings file: ${settingsPath}`));

          console.log(chalk.gray(`\nActive hooks:`));
          for (const [event, hookArray] of Object.entries(hooks)) {
            if (
              Array.isArray(hookArray) &&
              hookArray.some((hook: HookConfig) =>
                hook.hooks?.some((h) => h.command?.includes('.claude/hooks/'))
              )
            ) {
              console.log(chalk.gray(`  • ${event}`));
            }
          }
        } else {
          console.log(chalk.yellow('⚠️  TTS hooks are DISABLED'));
          console.log(chalk.blue('\n💡 To enable:'));
          console.log(chalk.gray('  claude: /audio enable, shell: stts claude enable'));
        }

        console.log(chalk.gray(`\n🔍 Checking Claude tool installation...`));
        try {
          const { code } = await execCommand('which claude || echo "not found"');
          if (code === 0) {
            console.log(chalk.green('✅ Claude tool is installed'));
          } else {
            console.log(chalk.yellow('⚠️  Claude tool is not installed'));
            console.log(
              chalk.gray('\n   Install it from: https://docs.anthropic.com/en/docs/claude')
            );
          }
        } catch {
          console.log(chalk.yellow('⚠️  Could not check Claude tool installation'));
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error checking status: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });

  return cmd;
}
