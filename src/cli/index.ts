#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ToolDetector } from '../installer/detector';
import { SettingsManager } from '../installer/settings-manager';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { VERSION } from '../utils/version';

// Type definitions for command options
interface DetectOptions {
  json?: boolean;
}

interface TestOptions {
  message: string;
}

interface HookEntry {
  command: string;
}

interface HookGroup {
  hooks: HookEntry[];
}

interface Settings {
  hooks?: Record<string, HookGroup[]>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('stts')
  .description('Smart Text-to-Speech installer for development tools')
  .version(VERSION);

// Detect command
program
  .command('detect [tool]')
  .description('Detect installed development tools')
  .option('--json', 'Output in JSON format')
  .action(async (tool: string | undefined, options: DetectOptions) => {
    const detector = new ToolDetector();
    const results = await detector.detect(tool);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log(chalk.blue('🔍 Detecting development tools...\n'));

    for (const result of results) {
      const status = result.detected ? chalk.green('✓ Found') : chalk.red('✗ Not found');

      console.log(`${status} ${result.name} (${result.executable})`);
    }

    if (tool && results.length > 0 && results[0].detected) {
      console.log(chalk.green(`\n${tool} found`));
      process.exit(0);
    } else if (tool && results.length > 0 && !results[0].detected) {
      console.log(chalk.red(`\n${tool} not found`));
      process.exit(1);
    }
  });

// Enable command
program
  .command('enable <tool>')
  .description('Enable TTS hooks for a development tool')
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
    const hooksPath = join(__dirname, '..', 'hooks');
    const manager = new SettingsManager(settingsPath);

    try {
      await manager.installHooks(hooksPath);

      // Create config file if options are provided
      if (options.dangerousCommands !== undefined || options.audio === false) {
        const { writeFileSync } = await import('fs');
        const pathModule = await import('path');
        const { homedir } = await import('os');

        const configPath = pathModule.join(homedir(), '.claude', 'stts.json');
        const config = {
          audioEnabled: options.audio !== false,
          enableDangerousCommandBlocking: options.dangerousCommands || false,
        };

        // Ensure .claude directory exists
        const { mkdirSync } = await import('fs');
        mkdirSync(pathModule.join(homedir(), '.claude'), { recursive: true });

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

// Disable command
program
  .command('disable <tool>')
  .description('Disable TTS hooks for a development tool')
  .action(async (tool: string) => {
    const detector = new ToolDetector();
    const settingsPath = await detector.getSettingsPath(tool);

    if (!settingsPath) {
      console.error(chalk.red('Could not find settings file'));
      process.exit(1);
    }

    console.log(chalk.blue(`🔇 Disabling TTS for ${tool}...\n`));

    const manager = new SettingsManager(settingsPath);

    try {
      await manager.removeHooks();
      console.log(chalk.green('\n✓ TTS hooks removed successfully'));
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to remove hooks: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show TTS status for all tools')
  .action(async () => {
    const detector = new ToolDetector();
    const results = await detector.detect();

    console.log(chalk.blue('📊 TTS Status Report\n'));

    for (const result of results) {
      if (!result.detected) continue;

      const settingsPath = await detector.getSettingsPath(result.executable);
      if (!settingsPath) continue;

      try {
        const content = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(content) as Settings;

        const hasHooks =
          settings.hooks &&
          Object.keys(settings.hooks).some((key) =>
            settings.hooks?.[key]?.some((h) =>
              h.hooks?.some(
                (hook) => hook.command?.includes('stts') || hook.command?.includes('@eh-aye/stts')
              )
            )
          );

        const status = hasHooks ? chalk.green('✓ Enabled') : chalk.gray('○ Disabled');

        console.log(`${status} ${result.name}`);
      } catch {
        console.log(`${chalk.gray('○ Disabled')} ${result.name}`);
      }
    }
  });

// Config command
program
  .command('config')
  .description('Manage STTS configuration')
  .option('--show', 'Show current configuration')
  .option('--enable-dangerous-commands', 'Enable dangerous command blocking')
  .option('--disable-dangerous-commands', 'Disable dangerous command blocking')
  .option('--enable-audio', 'Enable audio announcements')
  .option('--disable-audio', 'Disable audio announcements')
  .option('--add-dangerous-command <cmd>', 'Add a custom dangerous command pattern')
  .action(
    async (options: {
      show?: boolean;
      enableDangerousCommands?: boolean;
      disableDangerousCommands?: boolean;
      enableAudio?: boolean;
      disableAudio?: boolean;
      addDangerousCommand?: string;
    }) => {
      const { readFileSync, writeFileSync, existsSync, mkdirSync } = await import('fs');
      const pathModule = await import('path');
      const { homedir } = await import('os');

      const configPath = pathModule.join(homedir(), '.claude', 'stts.json');

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
      interface Config {
        audioEnabled: boolean;
        enableDangerousCommandBlocking: boolean;
        customDangerousCommands: string[];
      }

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
        mkdirSync(pathModule.join(homedir(), '.claude'), { recursive: true });
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.gray(`\nConfiguration saved to: ${configPath}`));
      } else {
        console.log(chalk.gray('No changes made to configuration'));
      }
    }
  );

// Test command
program
  .command('test')
  .description('Test TTS functionality')
  .option('-m, --message <text>', 'Custom message to speak', 'Testing TTS functionality')
  .action(async (options: TestOptions) => {
    try {
      const { loadTTS } = await import('../tts/index');
      const tts = loadTTS();

      console.log(chalk.blue('🔊 Testing TTS...\n'));

      const providers = await tts.listAvailable();
      console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));

      const provider = await tts.getProvider();
      if (provider) {
        console.log(chalk.blue(`Using ${provider.name} provider\n`));
      }

      const success = await tts.speak(options.message);

      if (success) {
        console.log(chalk.green('✓ TTS test successful!'));
      } else {
        console.log(chalk.red('✗ TTS test failed'));
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red(`Test failed: ${error instanceof Error ? error.message : String(error)}`)
      );
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(
    chalk.red(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`)
  );
  process.exit(1);
});

program.parse();
