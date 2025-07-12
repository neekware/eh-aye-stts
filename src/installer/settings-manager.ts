import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { ClaudeSettings, HookMatcher } from '../types';
import chalk from 'chalk';

export class SettingsManager {
  constructor(
    private settingsPath: string,
    private provider: string
  ) {}

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

  async installHooks(): Promise<void> {
    const settings = await this.loadSettings();

    // Initialize hooks structure
    if (!settings.hooks) {
      settings.hooks = {};
    }

    // Define all hook types and their corresponding Python scripts
    const hookTypes = [
      { name: 'PreToolUse', script: 'pre_tool_use.py' },
      { name: 'PostToolUse', script: 'post_tool_use.py' },
      { name: 'Notification', script: 'notification.py' },
      { name: 'Stop', script: 'stop.py' },
      { name: 'SubagentStop', script: 'subagent_stop.py' },
    ];

    // Get the project root directory
    const projectRoot = process.cwd();
    let updated = false;

    for (const { name, script } of hookTypes) {
      // Use direct Python script path
      const command = join(projectRoot, '.claude', 'hooks', script);

      const hookEntry: HookMatcher = {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command,
          },
        ],
      };

      // Check if hook already exists
      const hookKey = name as keyof typeof settings.hooks;
      if (!settings.hooks[hookKey]) {
        settings.hooks[hookKey] = [];
      }

      // Check if STTS hook already exists
      const existingHooks = settings.hooks[hookKey] || [];
      const sttsHookExists = existingHooks.some((h) =>
        h.hooks.some(
          (hook) => hook.command?.includes('.claude/hooks/') || hook.command?.includes(script)
        )
      );

      if (!sttsHookExists) {
        // Remove any old-style hooks first
        settings.hooks[hookKey] = existingHooks.filter(
          (h) =>
            !h.hooks.some(
              (hook) =>
                hook.command?.includes('~/.stts/hooks/') || hook.command?.includes('stts hook')
            )
        );

        // Add new hook
        settings.hooks[hookKey].push(hookEntry);
        console.log(chalk.green(`✓ Installed STTS ${name} hook`));
        updated = true;
      } else {
        console.log(chalk.yellow(`⚠ STTS ${name} hook already configured`));
      }
    }

    if (updated) {
      await this.saveSettings(settings);
      console.log(chalk.green(`\n✓ Settings updated: ${this.settingsPath}`));
    } else {
      console.log(chalk.yellow('\nNo changes needed - all hooks already configured'));
    }
  }

  async removeHooks(): Promise<void> {
    const settings = await this.loadSettings();

    if (!settings.hooks) {
      console.log(chalk.yellow('No hooks found to remove'));
      return;
    }

    let removed = false;
    // Pattern to match STTS hooks
    const sttsHookPattern = /\.claude\/hooks\/.*\.py|~\/\.stts\/hooks\/|stts hook/;

    // Remove only STTS-specific hooks from each hook type
    for (const hookType of Object.keys(settings.hooks)) {
      const hooks = settings.hooks[hookType as keyof typeof settings.hooks];
      if (!hooks) continue;

      const originalLength = hooks.length;
      const filtered = hooks.filter(
        (h) => !h.hooks.some((hook) => sttsHookPattern.test(hook.command))
      );

      if (filtered.length < originalLength) {
        if (filtered.length > 0) {
          settings.hooks[hookType as keyof typeof settings.hooks] = filtered;
        } else {
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

  async ensurePythonHooks(): Promise<void> {
    const projectRoot = process.cwd();
    const hooksDir = join(projectRoot, '.claude', 'hooks');

    // Create hooks directory if it doesn't exist
    await fs.mkdir(hooksDir, { recursive: true });

    // Check if Python hooks exist
    const hookFiles = [
      'pre_tool_use.py',
      'post_tool_use.py',
      'notification.py',
      'stop.py',
      'subagent_stop.py',
    ];

    for (const hookFile of hookFiles) {
      const hookPath = join(hooksDir, hookFile);
      try {
        await fs.access(hookPath);
      } catch {
        console.log(chalk.yellow(`⚠ Missing hook file: ${hookFile}`));
        console.log(chalk.yellow(`  Please ensure Python hook scripts are in: ${hooksDir}`));
      }
    }
  }
}
