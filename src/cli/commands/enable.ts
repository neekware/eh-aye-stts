import { Command } from 'commander';
import chalk from 'chalk';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      const hooksPath = join(__dirname, '..', '..', 'hooks');
      const manager = new SettingsManager(settingsPath);

      try {
        await manager.installHooks(hooksPath);

        // Create config file if options are provided
        if (options.dangerousCommands !== undefined || options.audio === false) {
          const configPath = join(homedir(), '.stts.json');
          const config = {
            audioEnabled: options.audio !== false,
            enableDangerousCommandBlocking: options.dangerousCommands || false,
          };

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
        }

        console.log(chalk.green('\n✨ TTS hooks installed successfully!'));
        console.log(chalk.gray(`\nHooks will be triggered on:`));
        console.log(chalk.gray('  • Tool usage announcements'));
        console.log(chalk.gray('  • Notifications'));
        console.log(chalk.gray('  • Session completion'));
        console.log(chalk.gray('  • Agent task completion'));

        if (options.dangerousCommands) {
          console.log(chalk.yellow('\n⚠️  Dangerous command blocking is ENABLED'));
          console.log(chalk.gray('  Commands like rm -rf, git push --force will be blocked'));
        }

        if (options.audio === false) {
          console.log(chalk.gray('\n🔇 Audio announcements are DISABLED'));
        }
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
