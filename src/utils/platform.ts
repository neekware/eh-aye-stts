import { platform, homedir } from 'os';
import { join, normalize } from 'path';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { spawn, SpawnOptions } from 'child_process';

/**
 * Cross-platform utilities for file paths, shell commands, and OS detection
 */

export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  switch (platform()) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return 'linux';
  }
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return platform() === 'win32';
}

/**
 * Get the user's home directory with proper expansion
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Normalize a path for the current platform
 * Handles ~ expansion and converts to proper separators
 */
export function normalizePath(path: string): string {
  // Expand ~ to home directory
  if (path.startsWith('~/') || path === '~') {
    path = join(getHomeDir(), path.slice(2));
  }

  // Handle %USERPROFILE% or %APPDATA% on Windows
  if (isWindows()) {
    path = path.replace(/%USERPROFILE%/g, getHomeDir());
    path = path.replace(
      /%APPDATA%/g,
      process.env.APPDATA || join(getHomeDir(), 'AppData', 'Roaming')
    );
  }

  return normalize(path);
}

/**
 * Get the shell command to use for the current platform
 */
export function getShell(): { command: string; args: string[] } {
  if (isWindows()) {
    // Prefer PowerShell if available, fall back to cmd
    const powerShellPath = join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe'
    );

    if (existsSync(powerShellPath)) {
      return { command: powerShellPath, args: ['-NoProfile', '-Command'] };
    }

    return { command: 'cmd.exe', args: ['/c'] };
  }

  // Unix-like systems
  return { command: '/bin/sh', args: ['-c'] };
}

/**
 * Execute a command in a cross-platform way
 */
export async function execCommand(
  command: string,
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const shell = getShell();
    const child = spawn(shell.command, [...shell.args, command], {
      ...options,
      shell: false, // We're already handling the shell
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    child.on('error', reject);

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        code: code || 0,
      });
    });
  });
}

/**
 * Get the file extension for executable scripts on the current platform
 */
export function getScriptExtension(): string {
  return isWindows() ? '.bat' : '';
}

/**
 * Get the command to check if a command exists
 */
export function getCommandExistsCommand(command: string): string {
  if (isWindows()) {
    return `where ${command} >nul 2>&1`;
  }
  return `command -v ${command} >/dev/null 2>&1`;
}

/**
 * Get platform-specific paths for common directories
 */
export function getPlatformPaths() {
  const home = getHomeDir();
  const platform = getPlatform();

  switch (platform) {
    case 'windows':
      return {
        config: process.env.APPDATA || join(home, 'AppData', 'Roaming'),
        data: process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'),
        temp: process.env.TEMP || join(home, 'AppData', 'Local', 'Temp'),
      };
    case 'macos':
      return {
        config: join(home, 'Library', 'Preferences'),
        data: join(home, 'Library', 'Application Support'),
        temp: process.env.TMPDIR || '/tmp',
      };
    default: // linux
      return {
        config: process.env.XDG_CONFIG_HOME || join(home, '.config'),
        data: process.env.XDG_DATA_HOME || join(home, '.local', 'share'),
        temp: process.env.TMPDIR || '/tmp',
      };
  }
}

/**
 * Get the npm global prefix in a cross-platform way
 */
export async function getNpmGlobalPrefix(): Promise<string> {
  try {
    const { stdout } = await execCommand('npm config get prefix');
    return stdout.trim();
  } catch {
    // Fallback to default locations
    if (isWindows()) {
      return process.env.APPDATA
        ? join(process.env.APPDATA, 'npm')
        : join(getHomeDir(), 'AppData', 'Roaming', 'npm');
    }
    return '/usr/local';
  }
}

/**
 * Check if running with elevated privileges
 */
export function isElevated(): boolean {
  if (isWindows()) {
    // On Windows, check if we can write to Program Files
    try {
      const testPath = join(process.env.ProgramFiles || 'C:\\Program Files', '.stts-test');
      writeFileSync(testPath, '');
      unlinkSync(testPath);
      return true;
    } catch {
      return false;
    }
  }

  // On Unix-like systems, check if we're root
  return process.getuid ? process.getuid() === 0 : false;
}

/**
 * Make a file executable on Unix-like systems (no-op on Windows)
 */
export async function makeExecutable(filePath: string): Promise<void> {
  if (!isWindows()) {
    const fs = await import('fs/promises');
    await fs.chmod(filePath, 0o755);
  }
}

/**
 * Get Claude Code settings path for the current platform
 */
export function getClaudeSettingsPath(): string {
  const home = getHomeDir();
  const platform = getPlatform();

  switch (platform) {
    case 'windows':
      // Windows: %USERPROFILE%\.claude\settings.json
      return join(home, '.claude', 'settings.json');
    case 'macos':
    case 'linux':
      // Unix-like: ~/.claude/settings.json
      return join(home, '.claude', 'settings.json');
  }
}

/**
 * Get the path separator for the current platform
 */
export function getPathSeparator(): string {
  return isWindows() ? ';' : ':';
}
