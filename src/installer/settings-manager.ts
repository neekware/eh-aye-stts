import { promises as fs } from 'fs';
import { dirname, join, basename } from 'path';
import { ClaudeSettings, HookMatcher } from '../types';
import chalk from 'chalk';

export class SettingsManager {
  private readonly MAX_BACKUPS = 5;

  constructor(private settingsPath: string) {}

  async loadSettings(): Promise<ClaudeSettings> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(content) as ClaudeSettings;
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

  async backupSettings(): Promise<string | null> {
    try {
      // Check if settings file exists
      await fs.access(this.settingsPath);

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupPath = `${this.settingsPath}.backup-${timestamp}`;

      // Copy current settings to backup
      await fs.copyFile(this.settingsPath, backupPath);

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      // Settings file doesn't exist, no backup needed
      return null;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const dir = dirname(this.settingsPath);
    const settingsName = basename(this.settingsPath);
    // Escape special regex characters in filename and build pattern
    const escapedName = settingsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const backupPattern = new RegExp(
      '^' + escapedName + '\\.backup-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}$'
    );

    try {
      const files = await fs.readdir(dir);
      const backups = files
        .filter((f) => backupPattern.test(f))
        .sort()
        .reverse();

      // Remove old backups, keeping only MAX_BACKUPS
      for (let i = this.MAX_BACKUPS; i < backups.length; i++) {
        await fs.unlink(join(dir, backups[i]));
      }
    } catch (error) {
      // Directory doesn't exist or can't be read, ignore
    }
  }

  async listBackups(): Promise<string[]> {
    const dir = dirname(this.settingsPath);
    const settingsName = basename(this.settingsPath);
    // Escape special regex characters in filename and build pattern
    const escapedName = settingsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const backupPattern = new RegExp(
      '^' + escapedName + '\\.backup-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}$'
    );

    try {
      const files = await fs.readdir(dir);
      return files
        .filter((f) => backupPattern.test(f))
        .sort()
        .reverse()
        .map((f) => join(dir, f));
    } catch (error) {
      return [];
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    // Verify backup file exists
    await fs.access(backupPath);

    // Create a backup of current settings before restoring
    const currentBackup = await this.backupSettings();

    try {
      // Restore from backup
      await fs.copyFile(backupPath, this.settingsPath);
      console.log(chalk.green(`✓ Restored settings from: ${backupPath}`));
    } catch (error) {
      // If restore fails, try to restore the current backup
      if (currentBackup) {
        await fs.copyFile(currentBackup, this.settingsPath);
      }
      throw error;
    }
  }

  async installHooks(): Promise<void> {
    // Create backup before modifying settings
    const backupPath = await this.backupSettings();
    if (backupPath) {
      console.log(chalk.gray(`📁 Created backup: ${basename(backupPath)}`));
    }

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
      { name: 'Agent', script: 'agent.js' },
    ];

    let updated = false;

    for (const { name, script } of hookTypes) {
      // Use stts command instead of absolute paths
      const hookType = script.replace('.js', '');
      const hookEntry: HookMatcher = {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: `stts hook ${hookType}`,
          },
        ],
      };

      // Check if hook already exists
      const hookKey = name as keyof typeof settings.hooks;
      if (!settings.hooks[hookKey]) {
        settings.hooks[hookKey] = [];
      }

      // Check if our STTS hook is already installed
      // Pattern matches: stts hook command
      const sttsHookPattern = /stts hook/;
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
    // Create backup before modifying settings
    const backupPath = await this.backupSettings();
    if (backupPath) {
      console.log(chalk.gray(`📁 Created backup: ${basename(backupPath)}`));
    }

    const settings = await this.loadSettings();

    if (!settings.hooks) {
      console.log(chalk.yellow('No hooks found to remove'));
      return;
    }

    let removed = false;
    // Updated pattern to match stts hook command
    const sttsHookPattern = /stts hook/;

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
