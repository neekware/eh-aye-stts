import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { basename } from 'path';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

interface HookEntry {
  command: string;
}

interface HookGroup {
  hooks: HookEntry[];
}

interface Settings {
  hooks?: Record<string, HookGroup[]>;
}

export function statusCommand(): Command {
  return new Command('status')
    .description('Show TTS status for all tools')
    .option('--backups', 'List available settings backups')
    .option('--json', 'Output in JSON format')
    .addHelpText(
      'after',
      `
Shows the current TTS installation status for each detected development tool.

Examples:
  stts status               # Show TTS status for all tools
  stts status --backups     # List available settings backups
  stts status --json        # Output status in JSON format`
    )
    .action(async (options: { backups?: boolean; json?: boolean }) => {
      if (options.backups) {
        await showBackups();
        return;
      }
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
}

async function showBackups(): Promise<void> {
  const detector = new ToolDetector();
  const results = await detector.detect();

  for (const result of results) {
    if (!result.detected) continue;

    const settingsPath = await detector.getSettingsPath(result.executable);
    if (!settingsPath) continue;

    const manager = new SettingsManager(settingsPath, result.executable);
    const backups = await manager.listBackups();

    if (backups.length === 0) {
      console.log(chalk.gray(`No backups found for ${result.name}`));
      continue;
    }

    console.log(chalk.blue(`📁 Available backups for ${result.name}:\n`));
    backups.forEach((backup, index) => {
      const name = basename(backup);
      const timestamp = name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1];
      if (timestamp) {
        // Convert timestamp format from 2025-07-09T21-45-57 to 2025-07-09T21:45:57
        const isoTimestamp = timestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
        const date = new Date(isoTimestamp);
        console.log(`  ${index + 1}. ${date.toLocaleString()} - ${name}`);
      } else {
        console.log(`  ${index + 1}. ${name}`);
      }
    });
    console.log(); // Add blank line between providers
  }
}
