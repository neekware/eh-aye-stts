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
  .action(async (tool: string) => {
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
      console.log(chalk.green('\n✨ TTS hooks installed successfully!'));
      console.log(chalk.gray(`\nHooks will be triggered on:`));
      console.log(chalk.gray('  • Tool usage announcements'));
      console.log(chalk.gray('  • Notifications'));
      console.log(chalk.gray('  • Session completion'));
      console.log(chalk.gray('  • Agent task completion'));
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
