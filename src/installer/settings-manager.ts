import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ClaudeSettings, HookMatcher } from '../plugins/claude/types';
import { CLAUDE_DIR } from '../defaults';
import chalk from 'chalk';
import { platform, homedir } from 'os';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  async installHooks(wrapperType: 'local' = 'local'): Promise<void> {
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

      // Use global wrapper path
      const command = `~/.stts/hooks/stts hook ${hookType}`;

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
        h.hooks.some((hook) => hook.command?.includes('stts hook'))
      );

      if (!sttsHookExists) {
        // Add new hook
        settings.hooks[hookKey].push(hookEntry);
        console.log(chalk.green(`✓ Installed STTS ${name} hook`));
        updated = true;
      } else {
        // Update existing hook if wrapper type changed
        const existingHook = existingHooks.find((h) =>
          h.hooks.some((hook) => hook.command?.includes('stts hook'))
        );
        if (existingHook) {
          const existingCommand = existingHook.hooks[0].command;
          if (existingCommand !== command) {
            existingHook.hooks[0].command = command;
            console.log(chalk.green(`✓ Updated STTS ${name} hook to use ${wrapperType} wrapper`));
            updated = true;
          } else {
            console.log(
              chalk.yellow(`⚠ STTS ${name} hook already configured for ${wrapperType} wrapper`)
            );
          }
        }
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

          // It's an STTS hook - check if it's valid and not duplicate
          const isValidType = validHookTypes.some((type) => hook.command.includes(type));
          if (!isValidType) {
            console.log(chalk.yellow(`⚠ Removing invalid STTS hook: ${hook.command}`));
            purged = true;
            return false;
          }

          // Check for duplicates
          if (seenCommands.has(hook.command)) {
            console.log(chalk.yellow(`⚠ Removing duplicate STTS hook: ${hook.command}`));
            purged = true;
            return false;
          }

          seenCommands.add(hook.command);
          return true;
        });

        if (validHooks.length > 0) {
          uniqueHooks.push({
            ...hookMatcher,
            hooks: validHooks,
          });
        }
      }

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
      console.log(chalk.green('✓ Cleaned up invalid/duplicate STTS hooks'));
    }
  }

  generateWrapperScript(isGlobal: boolean): string {
    const isWindows = platform() === 'win32';

    if (isWindows) {
      return this.generateWindowsWrapper(isGlobal);
    } else {
      return this.generateUnixWrapper(isGlobal);
    }
  }

  private generateUnixWrapper(isGlobal: boolean): string {
    const fallbackMode = isGlobal ? 'user' : 'workspace';

    // Try to read from template
    try {
      const templatePath = join(__dirname, '..', '..', 'templates', 'wrappers', 'unix', 'stts');
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const template = require('fs').readFileSync(templatePath, 'utf8') as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return template.replace('${FALLBACK_MODE}', fallbackMode);
    } catch {
      // Fallback to inline template
      return `#!/bin/sh
# STTS wrapper script for Unix systems
# Auto-generated - do not edit manually

# Check if stts command is available
if command -v stts >/dev/null 2>&1; then
    # Pass all arguments to stts
    exec stts "$@"
else
    # Fallback behavior - configurable at runtime
    case "\${STTS_FALLBACK_MODE:-${fallbackMode}}" in
        "user")
            echo "Warning: stts command not found. Please install stts first." >&2
            exit 1
            ;;
        "workspace")
            # stts not available, silently continue
            exit 0
            ;;
        *)
            echo "Error: Unknown fallback mode: \${STTS_FALLBACK_MODE}" >&2
            exit 1
            ;;
    esac
fi`;
    }
  }

  private generateWindowsWrapper(_isGlobal: boolean): string {
    // Try to read from template
    try {
      const templatePath = join(
        __dirname,
        '..',
        '..',
        'templates',
        'wrappers',
        'windows',
        'stts.bat'
      );
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const template = require('fs').readFileSync(templatePath, 'utf8') as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return template;
    } catch {
      // Fallback to inline template
      return `@echo off
REM STTS wrapper script for Windows
REM Auto-generated - do not edit manually

REM Check if stts command is available
where stts >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    REM Pass all arguments to stts
    stts %*
) else (
    REM stts not available, show warning
    echo Warning: stts command not found. Please install stts first. >&2
    exit /b 1
)`;
    }
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

  async removeLocalWrappers(): Promise<void> {
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';
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

  async installGlobalWrapper(): Promise<void> {
    const scriptContent = this.generateWrapperScript(true);
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'stts.bat' : 'stts';

    // Global hooks go in ~/.stts/hooks directory
    const globalHooksDir = join(homedir(), '.stts', 'hooks');
    const scriptPath = join(globalHooksDir, scriptName);

    // Create global hooks directory
    await fs.mkdir(globalHooksDir, { recursive: true });

    // Write wrapper script
    await fs.writeFile(scriptPath, scriptContent);

    // Make executable on Unix systems
    if (!isWindows) {
      await fs.chmod(scriptPath, 0o755);
    }

    console.log(chalk.green(`✓ Installed global wrapper: ${scriptPath}`));
  }

  async installAudioCommand(): Promise<void> {
    const commandContent = this.generateAudioCommand();
    const isWindows = platform() === 'win32';
    const scriptName = isWindows ? 'audio.bat' : 'audio';

    // Audio command goes in ~/.claude/commands directory
    const claudeCommandsDir = join(homedir(), CLAUDE_DIR, 'commands');
    const scriptPath = join(claudeCommandsDir, scriptName);

    // Create commands directory
    await fs.mkdir(claudeCommandsDir, { recursive: true });

    // Write command script
    await fs.writeFile(scriptPath, commandContent);

    // Make executable on Unix systems
    if (!isWindows) {
      await fs.chmod(scriptPath, 0o755);
    }

    console.log(chalk.green(`✓ Installed audio command: ${scriptPath}`));
    console.log(chalk.gray('   Use "audio enable", "audio disable", or "audio status" in Claude'));
  }

  private generateAudioCommand(): string {
    const isWindows = platform() === 'win32';

    if (isWindows) {
      return `@echo off
REM Audio enable/disable/status command for Claude
REM Auto-generated by STTS
REM Works with the current project directory

if "%1"=="enable" (
    stts claude enable
    exit /b 0
)

if "%1"=="disable" (
    stts claude disable
    exit /b 0
)

if "%1"=="status" (
    stts claude status
    exit /b 0
)

echo Usage: audio [enable^|disable^|status]
echo.
echo   enable  - Enable audio notifications for current project
echo   disable - Disable audio notifications for current project
echo   status  - Check audio status for current project
exit /b 1`;
    } else {
      return `#!/bin/sh
# Audio enable/disable/status command for Claude
# Auto-generated by STTS
# Works with the current project directory

case "$1" in
    enable)
        stts claude enable
        ;;
    disable)
        stts claude disable
        ;;
    status)
        stts claude status
        ;;
    *)
        echo "Usage: audio [enable|disable|status]"
        echo ""
        echo "  enable  - Enable audio notifications for current project"
        echo "  disable - Disable audio notifications for current project" 
        echo "  status  - Check audio status for current project"
        exit 1
        ;;
esac`;
    }
  }
}
