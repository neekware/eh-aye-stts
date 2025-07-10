import { promises as fs } from 'fs';
import { dirname, join, basename } from 'path';
import { ClaudeSettings, HookMatcher } from '../types';
import { STTS_DIR, HOOKS_DIR, WRAPPER_SCRIPTS, CLAUDE_DIR } from '../defaults';
import chalk from 'chalk';
import { platform } from 'os';

export class SettingsManager {
  private readonly MAX_BACKUPS = 5;

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

  async backupSettings(): Promise<string | null> {
    try {
      // Check if settings file exists
      await fs.access(this.settingsPath);

      // Create backup directory in ~/.stts/backups/{provider}/
      const backupDir = join(STTS_DIR, 'backups', this.provider);
      await fs.mkdir(backupDir, { recursive: true });

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const settingsName = basename(this.settingsPath).replace('.json', '');
      const backupPath = join(backupDir, `${settingsName}.${timestamp}.json`);

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
    const backupDir = join(STTS_DIR, 'backups', this.provider);
    const settingsName = basename(this.settingsPath).replace('.json', '');
    // Escape special regex characters in filename and build pattern
    const escapedName = settingsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const backupPattern = new RegExp(
      '^' + escapedName + '\\.\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.json$'
    );

    try {
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter((f) => backupPattern.test(f))
        .sort()
        .reverse();

      // Remove old backups, keeping only MAX_BACKUPS
      for (let i = this.MAX_BACKUPS; i < backups.length; i++) {
        await fs.unlink(join(backupDir, backups[i]));
      }
    } catch (error) {
      // Directory doesn't exist or can't be read, ignore
    }
  }

  async listBackups(): Promise<string[]> {
    const backupDir = join(STTS_DIR, 'backups', this.provider);
    const settingsName = basename(this.settingsPath).replace('.json', '');
    // Escape special regex characters in filename and build pattern
    const escapedName = settingsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const backupPattern = new RegExp(
      '^' + escapedName + '\\.\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.json$'
    );

    try {
      const files = await fs.readdir(backupDir);
      return files
        .filter((f) => backupPattern.test(f))
        .sort()
        .reverse()
        .map((f) => join(backupDir, f));
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

  async installHooks(wrapperType: 'global' | 'local' | 'direct' = 'direct'): Promise<void> {
    // Purge any invalid or duplicate STTS hooks first
    await this.purgeSttsHooks();

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
    ];

    let updated = false;

    for (const { name, script } of hookTypes) {
      const hookType = script.replace('.js', '');

      // Determine the command based on wrapper type
      let command: string;
      if (wrapperType === 'global') {
        // Use the global wrapper path
        command = `~/.stts/hooks/stts hook ${hookType}`;
      } else if (wrapperType === 'local') {
        // Use the local wrapper path
        command = `.claude/hooks/stts hook ${hookType}`;
      } else {
        // Direct stts command (for backward compatibility)
        command = `stts hook ${hookType}`;
      }

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

      // Check if our STTS hook is already installed
      // Pattern matches: stts hook command
      const sttsHookPattern = /stts hook/;
      const existingIndex = settings.hooks[hookKey].findIndex((h) =>
        h.hooks.some((hook) => sttsHookPattern.test(hook.command))
      );

      if (existingIndex === -1) {
        // No existing STTS hook, add new one
        settings.hooks[hookKey].push(hookEntry);
        updated = true;
        console.log(chalk.green(`✓ Installed STTS ${name} hook`));
      } else {
        // Check if the existing hook has the correct command for the wrapper type
        const existingHook = settings.hooks[hookKey][existingIndex];
        const existingCommand = existingHook.hooks.find((h) =>
          sttsHookPattern.test(h.command)
        )?.command;

        if (existingCommand !== command) {
          // Update the command to match the wrapper type
          const hookIndex = existingHook.hooks.findIndex((h) => sttsHookPattern.test(h.command));
          if (hookIndex !== -1) {
            existingHook.hooks[hookIndex].command = command;
            updated = true;
            console.log(chalk.green(`✓ Updated STTS ${name} hook to use ${wrapperType} wrapper`));
          }
        } else {
          console.log(
            chalk.yellow(`⚠ STTS ${name} hook already configured for ${wrapperType} wrapper`)
          );
        }
      }
    }

    if (updated) {
      await this.saveSettings(settings);
      console.log(chalk.green(`\n✓ Settings updated: ${this.settingsPath}`));
    } else {
      console.log(chalk.yellow('\n⚠ All hooks already installed'));
    }

    // Clean up any provider-created backups from the original location
    await this.cleanupProviderBackups();
  }

  private async cleanupProviderBackups(): Promise<void> {
    const originalDir = dirname(this.settingsPath);
    const settingsName = basename(this.settingsPath);
    const backupPattern = new RegExp(
      '^' +
        settingsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\.backup-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}$'
    );

    try {
      const files = await fs.readdir(originalDir);
      const providerBackups = files.filter((f) => backupPattern.test(f));

      for (const backup of providerBackups) {
        const backupPath = join(originalDir, backup);
        await fs.unlink(backupPath);
        console.log(chalk.gray(`🗑️  Removed ${this.provider} backup: ${backup}`));
      }
    } catch (error) {
      // Ignore errors - the directory might not exist or be readable
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

    // Clean up any provider-created backups from the original location
    await this.cleanupProviderBackups();
  }

  async purgeSttsHooks(): Promise<void> {
    const settings = await this.loadSettings();

    if (!settings.hooks) {
      return;
    }

    let purged = false;
    // Pattern to match any STTS hook command variations
    const sttsHookPattern = /stts\s+hook/;
    const validHookTypes = [
      'pre-tool-use',
      'post-tool-use',
      'notification',
      'stop',
      'subagent-stop',
    ];

    // Process each hook type
    for (const hookType of Object.keys(settings.hooks)) {
      const hooks = settings.hooks[hookType as keyof typeof settings.hooks];
      if (!hooks || !Array.isArray(hooks)) continue;

      const uniqueHooks: HookMatcher[] = [];
      const seenCommands = new Set<string>();

      for (const hookMatcher of hooks) {
        if (!hookMatcher.hooks || !Array.isArray(hookMatcher.hooks)) continue;

        // Filter out invalid and duplicate STTS hooks
        const validHooks = hookMatcher.hooks.filter((hook) => {
          if (!sttsHookPattern.test(hook.command)) {
            // Not an STTS hook, keep it
            return true;
          }

          // It's an STTS hook, validate it
          const commandKey = hook.command.trim();

          // Check for duplicates
          if (seenCommands.has(commandKey)) {
            console.log(
              chalk.yellow(`⚠ Removing duplicate STTS hook in ${hookType}: ${commandKey}`)
            );
            purged = true;
            return false;
          }

          // Check if it's a valid STTS hook command
          const isValid = validHookTypes.some((type) => commandKey.includes(`hook ${type}`));

          if (!isValid) {
            console.log(
              chalk.yellow(`⚠ Removing invalid STTS hook in ${hookType}: ${commandKey}`)
            );
            purged = true;
            return false;
          }

          seenCommands.add(commandKey);
          return true;
        });

        // Only keep the hook matcher if it has valid hooks
        if (validHooks.length > 0) {
          uniqueHooks.push({
            ...hookMatcher,
            hooks: validHooks,
          });
        } else if (hookMatcher.hooks.some((h) => !sttsHookPattern.test(h.command))) {
          // Keep non-STTS hooks even if all STTS hooks were removed
          uniqueHooks.push(hookMatcher);
        }
      }

      // Update or remove the hook type
      if (uniqueHooks.length > 0) {
        settings.hooks[hookType as keyof typeof settings.hooks] = uniqueHooks;
      } else {
        delete settings.hooks[hookType as keyof typeof settings.hooks];
        purged = true;
      }
    }

    // Clean up empty hooks object
    if (settings.hooks && Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (purged) {
      await this.saveSettings(settings);
      console.log(chalk.green('✓ Purged invalid/duplicate STTS hooks'));
    }
  }

  generateWrapperScript(isUser: boolean): string {
    const isWindows = platform() === 'win32';
    const template = isWindows ? WRAPPER_SCRIPTS.BATCH : WRAPPER_SCRIPTS.BASH;

    let fallbackBehavior: string;
    if (isWindows) {
      fallbackBehavior = isUser
        ? WRAPPER_SCRIPTS.BATCH_USER_FALLBACK
        : WRAPPER_SCRIPTS.BATCH_WORKSPACE_FALLBACK;
    } else {
      fallbackBehavior = isUser
        ? WRAPPER_SCRIPTS.USER_FALLBACK
        : WRAPPER_SCRIPTS.WORKSPACE_FALLBACK;
    }

    return template
      .replace(/{{PROVIDER}}/g, this.provider)
      .replace(/{{FALLBACK_BEHAVIOR}}/g, fallbackBehavior);
  }

  async installGlobalWrappers(): Promise<void> {
    const scriptContent = this.generateWrapperScript(true);
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';
    const scriptPath = join(HOOKS_DIR, scriptName);

    // Create hooks directory
    await fs.mkdir(HOOKS_DIR, { recursive: true });

    // Write wrapper script
    await fs.writeFile(scriptPath, scriptContent);

    // Make executable on Unix systems
    if (!isWindows) {
      await fs.chmod(scriptPath, 0o755);
    }

    console.log(chalk.green(`✓ Installed user-level wrapper: ${scriptPath}`));
  }

  async installLocalWrappers(): Promise<void> {
    const scriptContent = this.generateWrapperScript(false);
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';

    // Local hooks go in PROJECT's .claude/hooks directory
    const projectClaudeDir = join(process.cwd(), CLAUDE_DIR);
    const localHooksDir = join(projectClaudeDir, 'hooks');
    const scriptPath = join(localHooksDir, scriptName);

    // Create local hooks directory
    await fs.mkdir(localHooksDir, { recursive: true });

    // Write wrapper script
    await fs.writeFile(scriptPath, scriptContent);

    // Make executable on Unix systems
    if (!isWindows) {
      await fs.chmod(scriptPath, 0o755);
    }

    console.log(chalk.green(`✓ Installed workspace wrapper: ${scriptPath}`));
  }

  async removeGlobalWrappers(): Promise<void> {
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';
    const scriptPath = join(HOOKS_DIR, scriptName);

    try {
      await fs.unlink(scriptPath);
      console.log(chalk.green(`✓ Removed user-level wrapper: ${scriptPath}`));
    } catch (error) {
      // Script doesn't exist, ignore
    }
  }

  async removeLocalWrappers(): Promise<void> {
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';

    // Remove from PROJECT's .claude/hooks directory
    const projectClaudeDir = join(process.cwd(), CLAUDE_DIR);
    const localHooksDir = join(projectClaudeDir, 'hooks');
    const scriptPath = join(localHooksDir, scriptName);

    try {
      await fs.unlink(scriptPath);
      console.log(chalk.green(`✓ Removed workspace wrapper: ${scriptPath}`));
    } catch (error) {
      // Script doesn't exist, ignore
    }
  }
}
