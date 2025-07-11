import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as childProcess from 'child_process';
import { join } from 'path';

// Mock the entire modules
vi.mock('os');
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('child_process');

// Import after mocking
import {
  getPlatform,
  isWindows,
  getHomeDir,
  normalizePath,
  getShell,
  execCommand,
  getScriptExtension,
  getCommandExistsCommand,
  getPlatformPaths,
  getNpmGlobalPrefix,
  isElevated,
  makeExecutable,
  getClaudeSettingsPath,
  getPathSeparator,
} from '../platform';

describe('Platform Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPlatform', () => {
    it('should return "windows" for win32', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      expect(getPlatform()).toBe('windows');
    });

    it('should return "macos" for darwin', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      expect(getPlatform()).toBe('macos');
    });

    it('should return "linux" for other platforms', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      expect(getPlatform()).toBe('linux');
    });
  });

  describe('isWindows', () => {
    it('should return true for Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      expect(isWindows()).toBe(true);
    });

    it('should return false for non-Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      expect(isWindows()).toBe(false);
    });
  });

  describe('getHomeDir', () => {
    it('should return home directory', () => {
      const mockHome = '/Users/test';
      vi.spyOn(os, 'homedir').mockReturnValue(mockHome);
      expect(getHomeDir()).toBe(mockHome);
    });
  });

  describe('normalizePath', () => {
    beforeEach(() => {
      vi.spyOn(os, 'homedir').mockReturnValue('/home/user');
    });

    it('should expand ~ to home directory', () => {
      expect(normalizePath('~/test')).toBe(join('/home/user', 'test'));
      expect(normalizePath('~')).toBe('/home/user');
    });

    it('should handle Windows environment variables', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(os, 'homedir').mockReturnValue('C:\\Users\\test');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';

      expect(normalizePath('%USERPROFILE%\\test')).toBe('C:\\Users\\test\\test');
      expect(normalizePath('%APPDATA%\\test')).toBe('C:\\Users\\test\\AppData\\Roaming\\test');
    });

    it('should normalize paths', () => {
      expect(normalizePath('/path//to///file')).toBe(join('/', 'path', 'to', 'file'));
    });
  });

  describe('getShell', () => {
    it('should return PowerShell for Windows if available', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const shell = getShell();
      expect(shell.command).toContain('powershell.exe');
      expect(shell.args).toEqual(['-NoProfile', '-Command']);
    });

    it('should return cmd.exe for Windows if PowerShell not available', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const shell = getShell();
      expect(shell.command).toBe('cmd.exe');
      expect(shell.args).toEqual(['/c']);
    });

    it('should return sh for Unix-like systems', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');

      const shell = getShell();
      expect(shell.command).toBe('/bin/sh');
      expect(shell.args).toEqual(['-c']);
    });
  });

  describe('getScriptExtension', () => {
    it('should return .bat for Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      expect(getScriptExtension()).toBe('.bat');
    });

    it('should return empty string for non-Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      expect(getScriptExtension()).toBe('');
    });
  });

  describe('getCommandExistsCommand', () => {
    it('should return where command for Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      expect(getCommandExistsCommand('node')).toBe('where node >nul 2>&1');
    });

    it('should return command -v for Unix', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      expect(getCommandExistsCommand('node')).toBe('command -v node >/dev/null 2>&1');
    });
  });

  describe('getPlatformPaths', () => {
    beforeEach(() => {
      vi.spyOn(os, 'homedir').mockReturnValue('/home/user');
    });

    it('should return Windows paths', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(os, 'homedir').mockReturnValue('C:\\Users\\test');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      process.env.TEMP = 'C:\\Users\\test\\AppData\\Local\\Temp';

      const paths = getPlatformPaths();
      expect(paths.config).toBe('C:\\Users\\test\\AppData\\Roaming');
      expect(paths.data).toBe('C:\\Users\\test\\AppData\\Local');
      expect(paths.temp).toBe('C:\\Users\\test\\AppData\\Local\\Temp');
    });

    it('should return macOS paths', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      process.env.TMPDIR = '/private/tmp';

      const paths = getPlatformPaths();
      expect(paths.config).toBe('/home/user/Library/Preferences');
      expect(paths.data).toBe('/home/user/Library/Application Support');
      expect(paths.temp).toBe('/private/tmp');
    });

    it('should return Linux paths', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      delete process.env.XDG_CONFIG_HOME;
      delete process.env.XDG_DATA_HOME;
      delete process.env.TMPDIR;

      const paths = getPlatformPaths();
      expect(paths.config).toBe('/home/user/.config');
      expect(paths.data).toBe('/home/user/.local/share');
      expect(paths.temp).toBe('/tmp');
    });
  });

  describe('execCommand', () => {
    it('should execute command and return output', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('output'));
          }),
        },
        stderr: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('error'));
          }),
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      });

      vi.spyOn(childProcess, 'spawn').mockImplementation(mockSpawn);
      vi.spyOn(os, 'platform').mockReturnValue('darwin');

      const result = await execCommand('echo test');

      expect(result.stdout).toBe('output');
      expect(result.stderr).toBe('error');
      expect(result.code).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('/bin/sh', ['-c', 'echo test'], expect.any(Object));
    });

    it('should handle command errors', async () => {
      const mockError = new Error('Command failed');
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') cb(mockError);
        }),
      });

      vi.spyOn(childProcess, 'spawn').mockImplementation(mockSpawn);

      await expect(execCommand('failing-command')).rejects.toThrow('Command failed');
    });
  });

  describe('getNpmGlobalPrefix', () => {
    it('should return npm prefix from command', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('/usr/local\n'));
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      });

      vi.spyOn(childProcess, 'spawn').mockImplementation(mockSpawn);
      vi.spyOn(os, 'platform').mockReturnValue('darwin');

      const prefix = await getNpmGlobalPrefix();
      expect(prefix).toBe('/usr/local');
    });

    it('should return Windows default on error', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') cb(new Error('npm not found'));
        }),
      });

      vi.spyOn(childProcess, 'spawn').mockImplementation(mockSpawn);
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(os, 'homedir').mockReturnValue('C:\\Users\\test');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';

      const prefix = await getNpmGlobalPrefix();
      expect(prefix).toBe(join('C:\\Users\\test\\AppData\\Roaming', 'npm'));
    });
  });

  describe('isElevated', () => {
    it('should check elevation on Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');

      // Mock successful write (elevated)
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      expect(isElevated()).toBe(true);

      // Mock failed write (not elevated)
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(isElevated()).toBe(false);
    });

    it('should check if root on Unix', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');

      // Mock as root
      const originalGetuid = process.getuid;
      process.getuid = vi.fn(() => 0);
      expect(isElevated()).toBe(true);

      // Mock as regular user
      process.getuid = vi.fn(() => 1000);
      expect(isElevated()).toBe(false);

      // Restore
      process.getuid = originalGetuid;
    });
  });

  describe('makeExecutable', () => {
    it('should chmod on Unix', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const mockChmod = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(fsPromises, 'chmod').mockImplementation(mockChmod);

      await makeExecutable('/path/to/file');
      expect(mockChmod).toHaveBeenCalledWith('/path/to/file', 0o755);
    });

    it('should do nothing on Windows', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const mockChmod = vi.fn();
      vi.spyOn(fsPromises, 'chmod').mockImplementation(mockChmod);

      await makeExecutable('/path/to/file');
      expect(mockChmod).not.toHaveBeenCalled();
    });
  });

  describe('getClaudeSettingsPath', () => {
    it('should return Windows Claude settings path', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(os, 'homedir').mockReturnValue('C:\\Users\\test');

      expect(getClaudeSettingsPath()).toBe(join('C:\\Users\\test', '.claude', 'settings.json'));
    });

    it('should return Unix Claude settings path', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      vi.spyOn(os, 'homedir').mockReturnValue('/Users/test');

      expect(getClaudeSettingsPath()).toBe('/Users/test/.claude/settings.json');
    });
  });

  describe('getPathSeparator', () => {
    it('should return ; for Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      expect(getPathSeparator()).toBe(';');
    });

    it('should return : for Unix', () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      expect(getPathSeparator()).toBe(':');
    });
  });
});
