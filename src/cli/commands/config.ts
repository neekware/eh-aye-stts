import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface Config {
  audioEnabled: boolean;
  enableDangerousCommandBlocking: boolean;
  customDangerousCommands: string[];
}

export function configCommand(): Command {
  const config = new Command('config').description('Manage STTS configuration').addHelpText(
    'after',
    `
Commands:
  show                Show current configuration
  audio               Configure audio announcements
  dangerous-commands  Configure dangerous command blocking

Examples:
  stts config show
  stts config audio --enable
  stts config audio --disable
  stts config dangerous-commands --enable
  stts config dangerous-commands --add "sudo rm -rf"`
  );

  // Add subcommands
  config
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const configPath = join(homedir(), '.stts.json');

      console.log(chalk.blue('📊 STTS Configuration\n'));

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;

        // Audio status
        if (config.audioEnabled) {
          console.log(chalk.green('🔊 Audio announcements: ENABLED'));
        } else {
          console.log(chalk.yellow('🔇 Audio announcements: DISABLED'));
        }

        // Dangerous commands
        if (config.enableDangerousCommandBlocking) {
          console.log(chalk.yellow('⚠️  Dangerous command blocking: ENABLED'));
          if (config.customDangerousCommands?.length > 0) {
            console.log(chalk.gray('   Custom patterns:'));
            config.customDangerousCommands.forEach((cmd) => {
              console.log(chalk.gray(`   • ${cmd}`));
            });
          }
        } else {
          console.log(chalk.gray('✓ Dangerous command blocking: DISABLED'));
        }

        console.log(chalk.gray(`\nConfig file: ${configPath}`));
      } else {
        console.log(chalk.gray('No configuration file found. Using defaults:'));
        console.log(chalk.green('🔊 Audio announcements: ENABLED (default)'));
        console.log(chalk.gray('✓ Dangerous command blocking: DISABLED (default)'));
        console.log(chalk.gray('\nRun "stts enable <tool>" to create configuration'));
      }
    });

  // Add audio command
  config
    .command('audio')
    .description('Configure audio announcements')
    .option('--enable', 'Enable audio announcements')
    .option('--disable', 'Disable audio announcements')
    .action((options: { enable?: boolean; disable?: boolean }) => {
      const configPath = join(homedir(), '.stts.json');

      // Show current status if no options provided
      if (!options.enable && !options.disable) {
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
          if (config.audioEnabled) {
            console.log(chalk.green('🔊 Audio announcements are currently ENABLED'));
          } else {
            console.log(chalk.yellow('🔇 Audio announcements are currently DISABLED'));
          }
        } else {
          console.log(chalk.green('🔊 Audio announcements are ENABLED (default)'));
        }
        console.log(chalk.gray('\nTo change: stts config audio --enable or --disable'));
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

      // Update config
      if (options.enable) {
        config.audioEnabled = true;
        console.log(chalk.green('✓ Audio announcements enabled'));
      } else if (options.disable) {
        config.audioEnabled = false;
        console.log(chalk.green('✓ Audio announcements disabled'));
      }

      // Save config
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
    });

  // Add dangerous-commands command
  config
    .command('dangerous-commands')
    .alias('dangerous')
    .description('Configure dangerous command blocking')
    .option('--enable', 'Enable dangerous command blocking')
    .option('--disable', 'Disable dangerous command blocking')
    .option('--add <pattern>', 'Add a custom dangerous command pattern')
    .action((options: { enable?: boolean; disable?: boolean; add?: string }) => {
      const configPath = join(homedir(), '.stts.json');

      // Show current status if no options provided
      if (!options.enable && !options.disable && !options.add) {
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
          if (config.enableDangerousCommandBlocking) {
            console.log(chalk.yellow('⚠️  Dangerous command blocking is currently ENABLED'));
            if (config.customDangerousCommands?.length > 0) {
              console.log(chalk.gray('\nCustom patterns:'));
              config.customDangerousCommands.forEach((cmd) => {
                console.log(chalk.gray(`  • ${cmd}`));
              });
            }
          } else {
            console.log(chalk.gray('✓ Dangerous command blocking is currently DISABLED'));
          }
        } else {
          console.log(chalk.gray('✓ Dangerous command blocking is DISABLED (default)'));
        }
        console.log(
          chalk.gray('\nTo change: stts config dangerous-commands --enable or --disable')
        );
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

      // Update config
      if (options.enable) {
        config.enableDangerousCommandBlocking = true;
        console.log(chalk.green('✓ Dangerous command blocking enabled'));
      } else if (options.disable) {
        config.enableDangerousCommandBlocking = false;
        console.log(chalk.green('✓ Dangerous command blocking disabled'));
      }

      if (options.add) {
        if (!config.customDangerousCommands) {
          config.customDangerousCommands = [];
        }
        if (!config.customDangerousCommands.includes(options.add)) {
          config.customDangerousCommands.push(options.add);
          console.log(chalk.green(`✓ Added dangerous command pattern: ${options.add}`));
        } else {
          console.log(chalk.yellow('Pattern already exists'));
        }
      }

      // Save config
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
    });

  return config;
}
