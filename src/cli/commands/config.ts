import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface Config {
  audioEnabled: boolean;
  enableDangerousCommandBlocking: boolean;
  customDangerousCommands: string[];
}

export function configCommand(): Command {
  return new Command('config')
    .description('Manage STTS configuration')
    .option('--show', 'Show current configuration')
    .option('--enable-dangerous-commands', 'Enable dangerous command blocking')
    .option('--disable-dangerous-commands', 'Disable dangerous command blocking')
    .option('--enable-audio', 'Enable audio announcements')
    .option('--disable-audio', 'Disable audio announcements')
    .option('--add-dangerous-command <cmd>', 'Add a custom dangerous command pattern')
    .action(
      (options: {
        show?: boolean;
        enableDangerousCommands?: boolean;
        disableDangerousCommands?: boolean;
        enableAudio?: boolean;
        disableAudio?: boolean;
        addDangerousCommand?: string;
      }) => {
        const configPath = join(homedir(), '.claude', 'stts.json');

        // Show config
        if (options.show) {
          if (existsSync(configPath)) {
            const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
            console.log(chalk.blue('Current STTS Configuration:'));
            console.log(JSON.stringify(config, null, 2));
          } else {
            console.log(chalk.gray('No configuration file found. Using defaults.'));
            console.log(chalk.gray('Default configuration:'));
            console.log(
              JSON.stringify(
                {
                  audioEnabled: true,
                  enableDangerousCommandBlocking: false,
                  customDangerousCommands: [],
                },
                null,
                2
              )
            );
          }
          return;
        }

        // Load existing config or create new one
        let config: Config = {
          audioEnabled: true,
          enableDangerousCommandBlocking: false,
          customDangerousCommands: [],
        };

        if (existsSync(configPath)) {
          config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
        }

        // Update config based on options
        let changed = false;

        if (options.enableDangerousCommands) {
          config.enableDangerousCommandBlocking = true;
          changed = true;
          console.log(chalk.green('✓ Dangerous command blocking enabled'));
        }

        if (options.disableDangerousCommands) {
          config.enableDangerousCommandBlocking = false;
          changed = true;
          console.log(chalk.green('✓ Dangerous command blocking disabled'));
        }

        if (options.enableAudio) {
          config.audioEnabled = true;
          changed = true;
          console.log(chalk.green('✓ Audio announcements enabled'));
        }

        if (options.disableAudio) {
          config.audioEnabled = false;
          changed = true;
          console.log(chalk.green('✓ Audio announcements disabled'));
        }

        if (options.addDangerousCommand) {
          if (!config.customDangerousCommands) {
            config.customDangerousCommands = [];
          }
          if (!config.customDangerousCommands.includes(options.addDangerousCommand)) {
            config.customDangerousCommands.push(options.addDangerousCommand);
            changed = true;
            console.log(
              chalk.green(`✓ Added dangerous command pattern: ${options.addDangerousCommand}`)
            );
          } else {
            console.log(chalk.yellow('Command pattern already exists'));
          }
        }

        // Save config if changed
        if (changed) {
          mkdirSync(join(homedir(), '.claude'), { recursive: true });
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
        } else {
          console.log(chalk.gray('No changes made to configuration'));
        }
      }
    );
}
