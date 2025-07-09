import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { ClaudeSettings, HookMatcher } from '../types.js';
import chalk from 'chalk';

export class SettingsManager {
  constructor(private settingsPath: string) {}

  async loadSettings(): Promise<ClaudeSettings> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty settings
      return {};
    }
  }

  async saveSettings(settings: ClaudeSettings): Promise<void> {
    const dir = dirname(this.settingsPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  async installHooks(hookScriptsPath: string): Promise<void> {
    const settings = await this.loadSettings();

    // Initialize hooks structure
    if (!settings.hooks) {
      settings.hooks = {};
    }

    // Define all hook types and their corresponding scripts
    const hookTypes = [
      { name: 'PreToolUse', script: 'pre-tool-use.js' },
      { name: 'PostToolUse', script: 'post-tool-use.js' },
      { name: 'Notification', script: 'notification.js' },
      { name: 'Stop', script: 'stop.js' },
      { name: 'SubagentStop', script: 'subagent-stop.js' },
    ];

    let updated = false;

    for (const { name, script } of hookTypes) {
      const scriptPath = join(hookScriptsPath, script);
      const hookEntry: HookMatcher = {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: `node ${scriptPath}`,
          },
        ],
      };

      // Check if hook already exists
      const hookKey = name as keyof typeof settings.hooks;
      if (!settings.hooks[hookKey]) {
        settings.hooks[hookKey] = [];
      }

      // Check if our STTS hook is already installed
      const sttsHookPattern = /stts\/dist\/hooks\/|@ehaye\/stts|node .*\/stts\/dist\/hooks\//;
      const existing = settings.hooks[hookKey].find((h) =>
        h.hooks.some((hook) => sttsHookPattern.test(hook.command))
      );

      if (!existing) {
        settings.hooks[hookKey].push(hookEntry);
        updated = true;
        console.log(chalk.green(`✓ Installed STTS ${name} hook`));
      } else {
        console.log(chalk.yellow(`⚠ STTS ${name} hook already installed`));
      }
    }

    if (updated) {
      await this.saveSettings(settings);
      console.log(chalk.green(`\n✓ Settings updated: ${this.settingsPath}`));
    } else {
      console.log(chalk.yellow('\n⚠ All hooks already installed'));
    }
  }

  async removeHooks(): Promise<void> {
    const settings = await this.loadSettings();

    if (!settings.hooks) {
      console.log(chalk.yellow('No hooks found to remove'));
      return;
    }

    let removed = false;
    const sttsHookPattern = /stts\/dist\/hooks\/|@ehaye\/stts|node .*\/stts\/dist\/hooks\//;

    // Remove only STTS-specific hooks from each hook type
    for (const hookType of Object.keys(settings.hooks)) {
      const hooks = settings.hooks[hookType as keyof typeof settings.hooks];
      if (!hooks) continue;

      const originalLength = hooks.length;
      const filtered = hooks.filter(
        (h) => !h.hooks.some((hook) => sttsHookPattern.test(hook.command))
      );

      if (filtered.length < originalLength) {
        // Only update if we actually removed something
        if (filtered.length > 0) {
          settings.hooks[hookType as keyof typeof settings.hooks] = filtered;
        } else {
          // Only delete the hook type if it's now empty AND we removed something
          delete settings.hooks[hookType as keyof typeof settings.hooks];
        }
        removed = true;
        console.log(chalk.green(`✓ Removed STTS ${hookType} hook`));
      }
    }

    // Clean up empty hooks object
    if (settings.hooks && Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (removed) {
      await this.saveSettings(settings);
      console.log(chalk.green(`\n✓ STTS hooks removed from: ${this.settingsPath}`));
    } else {
      console.log(chalk.yellow('No STTS hooks found to remove'));
    }
  }
}
