import { Command } from 'commander';
import chalk from 'chalk';
import { dirname } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { GLOBAL_CONFIG_PATH } from '../../utils/config';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function enableCommand(): Command {
  return new Command('enable')
    .description('Enable TTS hooks for a development tool')
    .argument('<tool>', 'Tool to enable TTS for')
    .option('--dangerous-commands', 'Enable dangerous command blocking')
    .option('--no-audio', 'Disable audio announcements')
    .action(async (tool: string, options: { dangerousCommands?: boolean; audio?: boolean }) => {
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
      const manager = new SettingsManager(settingsPath);

      try {
        await manager.installHooks();

        // Always create/update config file
        const configPath = GLOBAL_CONFIG_PATH;

        // Ensure directory exists
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          mkdirSync(configDir, { recursive: true });
        }
        let existingConfig = {};

        // Read existing config if it exists
        try {
          const configContent = readFileSync(configPath, 'utf8');
          existingConfig = JSON.parse(configContent);
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
    });
}
