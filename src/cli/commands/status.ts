import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { ToolDetector } from '../../installer/detector';

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
  return new Command('status').description('Show TTS status for all tools').action(async () => {
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
