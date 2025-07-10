import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { SETTINGS_PATH, DEFAULT_CONFIG } from '../../defaults';

interface Config {
  audioEnabled: boolean;
  enableDangerousCommandBlocking: boolean;
  customDangerousCommands: string[];
  llmEnabled?: boolean;
  llmModel?: string;
  llmStyle?: 'casual' | 'professional' | 'encouraging';
  llmMaxWords?: number;
  llmCacheEnabled?: boolean;
  llmCacheTTL?: number;
}

export function configCommand(): Command {
  const config = new Command('config').description('Manage STTS configuration').addHelpText(
    'after',
    `
Commands:
  show                Show current configuration
  audio               Configure audio announcements
  dangerous-commands  Configure dangerous command blocking
  llm                 Configure LLM feedback settings
  set <key> <value>   Set a configuration value

Examples:
  stts config show
  stts config audio --enable
  stts config audio --disable
  stts config dangerous-commands --enable
  stts config dangerous-commands --add "sudo rm -rf"
  stts config llm --enable
  stts config llm --style casual
  stts config set llmMaxWords 8`
  );

  // Add subcommands
  config
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const configPath = SETTINGS_PATH;

      console.log(chalk.blue('📊 STTS Configuration\n'));

      try {
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

        // LLM settings
        console.log('');
        if (config.llmEnabled !== false) {
          console.log(chalk.green('🤖 LLM feedback: ENABLED'));
          console.log(chalk.gray(`   Model: ${config.llmModel || 'claude-3-5-sonnet-20241022'}`));
          console.log(chalk.gray(`   Style: ${config.llmStyle || 'casual'}`));
          console.log(chalk.gray(`   Max words: ${config.llmMaxWords || 10}`));
          if (config.llmCacheEnabled !== false) {
            console.log(chalk.gray(`   Cache: enabled (TTL: ${config.llmCacheTTL || 300}s)`));
          }
        } else {
          console.log(chalk.yellow('🤖 LLM feedback: DISABLED'));
        }

        console.log(chalk.gray(`\nConfig file: ${configPath}`));
      } catch (error) {
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
      const configPath = SETTINGS_PATH;

      // Show current status if no options provided
      if (!options.enable && !options.disable) {
        try {
          const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
          if (config.audioEnabled) {
            console.log(chalk.green('🔊 Audio announcements are currently ENABLED'));
          } else {
            console.log(chalk.yellow('🔇 Audio announcements are currently DISABLED'));
          }
        } catch (error) {
          console.log(chalk.green('🔊 Audio announcements are ENABLED (default)'));
        }
        console.log(chalk.gray('\nTo change: stts config audio --enable or --disable'));
        return;
      }

      // Load existing config or create new one
      let config: Config = { ...DEFAULT_CONFIG };

      try {
        config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
      } catch (error) {
        // Use default config if file doesn't exist
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
      // Ensure directory exists
      const configDir = dirname(configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
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
      const configPath = SETTINGS_PATH;

      // Show current status if no options provided
      if (!options.enable && !options.disable && !options.add) {
        try {
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
        } catch (error) {
          console.log(chalk.gray('✓ Dangerous command blocking is DISABLED (default)'));
        }
        console.log(
          chalk.gray('\nTo change: stts config dangerous-commands --enable or --disable')
        );
        return;
      }

      // Load existing config or create new one
      let config: Config = { ...DEFAULT_CONFIG };

      try {
        config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
      } catch (error) {
        // Use default config if file doesn't exist
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
      // Ensure directory exists
      const configDir = dirname(configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
    });

  // Add llm command
  config
    .command('llm')
    .description('Configure LLM feedback settings')
    .option('--enable', 'Enable LLM-powered feedback')
    .option('--disable', 'Disable LLM-powered feedback')
    .option('--style <style>', 'Set feedback style (casual, professional, encouraging)')
    .option('--max-words <number>', 'Set maximum words for feedback')
    .option('--model <model>', 'Set Claude model to use')
    .option('--cache-enable', 'Enable response caching')
    .option('--cache-disable', 'Disable response caching')
    .option('--cache-ttl <seconds>', 'Set cache TTL in seconds')
    .action(
      (options: {
        enable?: boolean;
        disable?: boolean;
        style?: string;
        maxWords?: string;
        model?: string;
        cacheEnable?: boolean;
        cacheDisable?: boolean;
        cacheTtl?: string;
      }) => {
        const configPath = SETTINGS_PATH;

        // Show current status if no options provided
        if (!Object.keys(options).length) {
          try {
            const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
            if (config.llmEnabled !== false) {
              console.log(chalk.green('🤖 LLM feedback is currently ENABLED'));
              console.log(
                chalk.gray(`   Model: ${config.llmModel || 'claude-3-5-sonnet-20241022'}`)
              );
              console.log(chalk.gray(`   Style: ${config.llmStyle || 'casual'}`));
              console.log(chalk.gray(`   Max words: ${config.llmMaxWords || 10}`));
              if (config.llmCacheEnabled !== false) {
                console.log(chalk.gray(`   Cache: enabled (TTL: ${config.llmCacheTTL || 300}s)`));
              } else {
                console.log(chalk.gray('   Cache: disabled'));
              }
            } else {
              console.log(chalk.yellow('🤖 LLM feedback is currently DISABLED'));
            }
          } catch (error) {
            console.log(chalk.green('🤖 LLM feedback is ENABLED (default)'));
          }
          console.log(chalk.gray('\nTo change: stts config llm --enable or --disable'));
          console.log(chalk.gray('           stts config llm --style casual'));
          return;
        }

        // Load existing config or create new one
        let config: Config = { ...DEFAULT_CONFIG };

        try {
          config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;
        } catch (error) {
          // Use default config if file doesn't exist
        }

        // Update config
        if (options.enable) {
          config.llmEnabled = true;
          console.log(chalk.green('✓ LLM feedback enabled'));
        } else if (options.disable) {
          config.llmEnabled = false;
          console.log(chalk.green('✓ LLM feedback disabled'));
        }

        if (options.style) {
          if (['casual', 'professional', 'encouraging'].includes(options.style)) {
            config.llmStyle = options.style as 'casual' | 'professional' | 'encouraging';
            console.log(chalk.green(`✓ Feedback style set to: ${options.style}`));
          } else {
            console.log(chalk.red('Invalid style. Choose: casual, professional, or encouraging'));
            return;
          }
        }

        if (options.maxWords) {
          const maxWords = parseInt(options.maxWords, 10);
          if (!isNaN(maxWords) && maxWords > 0 && maxWords <= 50) {
            config.llmMaxWords = maxWords;
            console.log(chalk.green(`✓ Max words set to: ${maxWords}`));
          } else {
            console.log(chalk.red('Invalid max words. Must be between 1 and 50'));
            return;
          }
        }

        if (options.model) {
          config.llmModel = options.model;
          console.log(chalk.green(`✓ Model set to: ${options.model}`));
        }

        if (options.cacheEnable) {
          config.llmCacheEnabled = true;
          console.log(chalk.green('✓ Response caching enabled'));
        } else if (options.cacheDisable) {
          config.llmCacheEnabled = false;
          console.log(chalk.green('✓ Response caching disabled'));
        }

        if (options.cacheTtl) {
          const ttl = parseInt(options.cacheTtl, 10);
          if (!isNaN(ttl) && ttl > 0) {
            config.llmCacheTTL = ttl;
            console.log(chalk.green(`✓ Cache TTL set to: ${ttl} seconds`));
          } else {
            console.log(chalk.red('Invalid TTL. Must be a positive number'));
            return;
          }
        }

        // Save config
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          mkdirSync(configDir, { recursive: true });
        }
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
      }
    );

  // Add generic set command
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const configPath = SETTINGS_PATH;

      // Load existing config or create new one
      let config: any = { ...DEFAULT_CONFIG };

      try {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch (error) {
        // Use default config if file doesn't exist
      }

      // Parse value
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      // Set the value
      config[key] = parsedValue;
      console.log(chalk.green(`✓ Set ${key} = ${parsedValue}`));

      // Save config
      const configDir = dirname(configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
    });

  return config;
}
