import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadSTTSConfig, getConfigValue, getEnvWithFallback } from '../../utils/config';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/user'),
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadSTTSConfig', () => {
    it('should return default config when no files exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: true,
        enableDangerousCommandBlocking: false,
        customDangerousCommands: [],
        debug: false,
      });
    });

    it('should load global config from home directory', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/home/user/.stts') return true; // Directory exists
        if (path === '/home/user/.stts/settings.json') return true; // Config exists
        return false;
      });
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          audioEnabled: false,
          enableDangerousCommandBlocking: true,
        })
      );

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: false,
        enableDangerousCommandBlocking: true,
        customDangerousCommands: [],
        debug: false,
      });
    });

    it('should load project config from current directory', () => {
      const projectPath = join(process.cwd(), '.stts.json');
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === projectPath;
      });
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          audioEnabled: false,
          customDangerousCommands: ['custom-cmd'],
        })
      );

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: false,
        enableDangerousCommandBlocking: false,
        customDangerousCommands: ['custom-cmd'],
        debug: false,
      });
    });

    it('should merge global and project configs with project overriding global', () => {
      const globalPath = '/home/user/.stts/settings.json';
      const projectPath = join(process.cwd(), '.stts.json');

      vi.mocked(existsSync).mockImplementation((path) => {
        return path === globalPath || path === projectPath;
      });

      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === globalPath) {
          return JSON.stringify({
            audioEnabled: false,
            enableDangerousCommandBlocking: true,
            customDangerousCommands: ['global-cmd1', 'global-cmd2'],
          });
        }
        if (path === projectPath) {
          return JSON.stringify({
            audioEnabled: true,
            customDangerousCommands: ['project-cmd'],
          });
        }
        return '';
      });

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: true, // Project overrides global
        enableDangerousCommandBlocking: true, // From global
        customDangerousCommands: ['project-cmd'], // Project overrides global
        debug: false,
      });
    });

    it('should handle parse errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: true,
        enableDangerousCommandBlocking: false,
        customDangerousCommands: [],
        debug: false,
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should override with environment variables', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/home/user/.stts/settings.json';
      });
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          audioEnabled: true,
          enableDangerousCommandBlocking: false,
        })
      );

      process.env.STTS_AUDIO_ENABLED = 'false';
      process.env.STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING = 'true';
      process.env.STTS_CUSTOM_DANGEROUS_COMMANDS = 'env-cmd1,env-cmd2';

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: false,
        enableDangerousCommandBlocking: true,
        customDangerousCommands: ['env-cmd1', 'env-cmd2'],
        debug: false,
      });
    });

    it('should handle environment variables with spaces in command list', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      process.env.STTS_CUSTOM_DANGEROUS_COMMANDS = ' cmd1 , cmd2 , cmd3 ';

      const config = loadSTTSConfig();

      expect(config.customDangerousCommands).toEqual(['cmd1', 'cmd2', 'cmd3']);
    });
  });

  describe('getConfigValue', () => {
    it('should return specific config value', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/home/user/.stts') return true;
        return false;
      });
      const value = getConfigValue('audioEnabled');
      expect(value).toBe(true);
    });

    it('should return provided default value when config value is undefined', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/home/user/.stts') return true;
        return false;
      });
      const value = getConfigValue('audioEnabled', false);
      expect(value).toBe(true); // Still returns config value, not the provided default
    });
  });

  describe('getEnvWithFallback', () => {
    it('should return primary env value when set', () => {
      process.env.STTS_OPENAI_API_KEY = 'stts-key';
      process.env.OPENAI_API_KEY = 'fallback-key';

      const value = getEnvWithFallback('STTS_OPENAI_API_KEY', 'OPENAI_API_KEY');
      expect(value).toBe('stts-key');
    });

    it('should return fallback env value when primary is not set', () => {
      delete process.env.STTS_OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'fallback-key';

      const value = getEnvWithFallback('STTS_OPENAI_API_KEY', 'OPENAI_API_KEY');
      expect(value).toBe('fallback-key');
    });

    it('should return undefined when neither env var is set', () => {
      delete process.env.STTS_OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const value = getEnvWithFallback('STTS_OPENAI_API_KEY', 'OPENAI_API_KEY');
      expect(value).toBeUndefined();
    });
  });
});
