import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CLAUDE_DIR } from '../../defaults';
import { SettingsManager } from '../../installer/settings-manager';
import { existsSync } from 'fs';

export function statusCommand(): Command {
  return new Command('status')
    .description('Check TTS hooks status for a development tool')
    .argument('<tool>', 'Tool to check status for (currently supports: claude-code, claude)')
    .addHelpText(
      'after',
      `
Examples:
  stts status claude-code                Check TTS status

Note: Checks hooks in .claude/settings.local.json
Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(async (tool: string) => {
      // Validate tool parameter
      const supportedTools = ['claude', 'claude-code'];
      if (!supportedTools.includes(tool.toLowerCase())) {
        console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
        console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
        console.error(chalk.gray(`\nUse 'stts status --help' for more information`));
        process.exit(1);
      }

      console.log(chalk.blue(`🔍 Checking TTS status for ${tool}...\n`));

      // Check local settings
      const actualSettingsPath = join(process.cwd(), CLAUDE_DIR, 'settings.local.json');

      if (!existsSync(actualSettingsPath)) {
        console.log(chalk.yellow('🔇 TTS is NOT enabled for this project'));
        console.log(chalk.gray('   No .claude/settings.local.json file found'));
        console.log(chalk.gray('\nTo enable TTS, run: stts enable claude-code'));
        return;
      }

      // Create manager with appropriate settings path
      const manager = new SettingsManager(actualSettingsPath, tool);

      try {
        const settings = await manager.loadSettings();

        // Check if STTS hooks are installed
        const hasHooks =
          settings.hooks &&
          Object.keys(settings.hooks).some((hookType) => {
            const hooks = settings.hooks![hookType as keyof typeof settings.hooks];
            return (
              hooks &&
              hooks.some((h) => h.hooks.some((hook) => hook.command?.includes('stts hook')))
            );
          });

        if (hasHooks) {
          console.log(chalk.green('🔊 TTS is ENABLED for this project'));
          console.log(chalk.gray(`   Settings: ${actualSettingsPath}`));

          // List installed hooks
          const installedHooks: string[] = [];
          if (settings.hooks) {
            Object.keys(settings.hooks).forEach((hookType) => {
              const hooks = settings.hooks![hookType as keyof typeof settings.hooks];
              if (
                hooks &&
                hooks.some((h) => h.hooks.some((hook) => hook.command?.includes('stts hook')))
              ) {
                installedHooks.push(hookType);
              }
            });
          }

          if (installedHooks.length > 0) {
            console.log(chalk.gray('\nInstalled hooks:'));
            installedHooks.forEach((hook) => {
              console.log(chalk.gray(`  • ${hook}`));
            });
          }

          console.log(chalk.gray('\nTo disable TTS, run: stts disable claude-code'));
        } else {
          console.log(chalk.yellow('🔇 TTS is NOT enabled for this project'));
          console.log(chalk.gray('   Settings file exists but no STTS hooks found'));
          console.log(chalk.gray('\nTo enable TTS, run: stts enable claude-code'));
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to check status: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });
}
