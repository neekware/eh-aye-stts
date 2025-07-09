import { Command } from 'commander';
import chalk from 'chalk';
import { dirname } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { SETTINGS_PATH } from '../../defaults';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function enableCommand(): Command {
  const cmd = new Command('enable')
    .description('Enable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to enable TTS for (currently supports: claude-code, claude)')
    .option('--dangerous-commands', 'Enable dangerous command blocking')
    .option('--no-audio', 'Disable audio announcements')
    .option(
      '--global',
      'Install wrapper scripts globally in ~/.stts/hooks/ (warns if stts missing)'
    )
    .option('--local', 'Install wrapper scripts locally in .claude/hooks/ (silent if stts missing)')
    .addHelpText(
      'after',
      `
Examples:
  stts enable claude-code                Enable basic TTS hooks
  stts enable claude-code --global       Install global wrapper script
  stts enable claude-code --local        Install local wrapper script
  stts enable claude-code --no-audio     Enable without audio announcements

Supported tools: claude-code, claude`
    )
    .showHelpAfterError()
    .action(
      async (
        tool: string,
        options: { dangerousCommands?: boolean; audio?: boolean; global?: boolean; local?: boolean }
      ) => {
        const detector = new ToolDetector();
        const results = await detector.detect(tool);

        if (results.length === 0 || !results[0].detected) {
          console.error(chalk.red(`Tool '${tool}' not found`));
          process.exit(1);
        }

        console.log(chalk.blue(`📦 Enabling TTS for ${results[0].name}...\n`));

        // Get settings path
        const settingsPath = await detector.getSettingsPath(tool);
        if (!settingsPath) {
          console.error(chalk.red('Could not find settings file'));
          process.exit(1);
        }

        // Install hooks
        const manager = new SettingsManager(settingsPath, tool);

        try {
          await manager.installHooks();

          // Install wrapper scripts if requested
          if (options.global && options.local) {
            console.error(chalk.red('Cannot specify both --global and --local flags'));
            process.exit(1);
          }

          if (options.global) {
            await manager.installGlobalWrappers();
          } else if (options.local) {
            await manager.installLocalWrappers();
          }

          // Always create/update config file
          const configPath = SETTINGS_PATH;

          // Ensure directory exists
          const configDir = dirname(configPath);
          if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
          }
          let existingConfig: Record<string, unknown> = {};

          // Read existing config if it exists
          try {
            const configContent = readFileSync(configPath, 'utf8');
            existingConfig = JSON.parse(configContent) as Record<string, unknown>;
          } catch {
            // Config doesn't exist yet, that's fine
          }

          // Merge with new settings
          const config = {
            ...existingConfig,
            audioEnabled: options.audio !== false,
            enableDangerousCommandBlocking: options.dangerousCommands || false,
          };

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));

          console.log(chalk.green('\n✨ TTS hooks installed successfully!'));
          console.log(chalk.gray(`\nHooks will be triggered on:`));
          console.log(chalk.gray('  • Tool usage announcements'));
          console.log(chalk.gray('  • Notifications'));
          console.log(chalk.gray('  • Session completion'));
          console.log(chalk.gray('  • Agent task completion'));

          // Always show current status
          console.log(chalk.blue('\n📊 Current Configuration:'));

          if (config.audioEnabled) {
            console.log(chalk.green('  🔊 Audio announcements: ENABLED'));
            console.log(chalk.gray('     Run "stts test" to verify TTS is working'));
          } else {
            console.log(chalk.yellow('  🔇 Audio announcements: DISABLED'));
            console.log(chalk.gray('     Enable with: stts config audio --enable'));
          }

          if (config.enableDangerousCommandBlocking) {
            console.log(chalk.yellow('  ⚠️  Dangerous command blocking: ENABLED'));
            console.log(chalk.gray('     Commands like rm -rf, git push --force will be blocked'));
          } else {
            console.log(chalk.gray('  ✓ Dangerous command blocking: DISABLED'));
          }

          console.log(chalk.blue('\n💡 Next steps:'));
          console.log(chalk.gray('  • Test TTS:     stts test'));
          console.log(chalk.gray('  • View config:  stts config show'));
          console.log(chalk.gray('  • Check status: stts status'));
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
