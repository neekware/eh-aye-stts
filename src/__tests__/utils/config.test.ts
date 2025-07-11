import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'fs';
import { loadSTTSConfig, getConfigValue, mergeWithDefaults } from '../../utils/config';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
}));

// Mock default config
vi.mock('../../defaults', () => ({
  STTS_DIR: '/home/user/.stts',
  SETTINGS_PATH: '/home/user/.stts/settings.json',
  DEFAULT_CONFIG: {
    audioEnabled: true,
    debug: false,
  },
  ENV_VARS: {
    AUDIO_ENABLED: 'STTS_AUDIO_ENABLED',
    DEBUG: 'STTS_DEBUG',
  },
}));

describe('Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSTTSConfig', () => {
    it('should return default config when no files exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: true,
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
        })
      );
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      expect(loadSTTSConfig()).toEqual({
        audioEnabled: false,
        debug: false,
      });
    });

    it('should load project config from current directory', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path as string;
        if (pathStr === '/home/user/.stts') return true;
        if (pathStr.endsWith('.stts.json') && pathStr.includes(process.cwd())) return true;
        return false;
      });
      vi.mocked(readFileSync).mockImplementation((path) => {
        const pathStr = path as string;
        if (pathStr.endsWith('.stts.json')) {
          return JSON.stringify({ audioEnabled: false });
        }
        return '{}';
      });
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      expect(loadSTTSConfig()).toEqual({
        audioEnabled: false,
        debug: false,
      });
    });

    it('should merge global and project configs with project overriding global', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path as string;
        if (pathStr === '/home/user/.stts') return true;
        if (pathStr === '/home/user/.stts/settings.json') return true;
        if (pathStr.endsWith('.stts.json') && pathStr.includes(process.cwd())) return true;
        return false;
      });
      vi.mocked(readFileSync).mockImplementation((path) => {
        const pathStr = path as string;
        if (pathStr === '/home/user/.stts/settings.json') {
          return JSON.stringify({ audioEnabled: false, debug: true });
        }
        if (pathStr.endsWith('.stts.json')) {
          return JSON.stringify({ audioEnabled: true });
        }
        return '{}';
      });
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      expect(loadSTTSConfig()).toEqual({
        audioEnabled: true,
        debug: false, // Project config doesn't specify debug, so it uses default
      });
    });

    it('should handle parse errors gracefully', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/home/user/.stts') return true;
        if (path === '/home/user/.stts/settings.json') return true;
        return false;
      });
      vi.mocked(readFileSync).mockReturnValue('invalid json');
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const config = loadSTTSConfig();

      expect(config).toEqual({
        audioEnabled: true,
        debug: false,
      });
    });

    it('should override with environment variables', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      process.env.STTS_AUDIO_ENABLED = 'false';
      process.env.STTS_DEBUG = 'true';

      expect(loadSTTSConfig()).toEqual({
        audioEnabled: false,
        debug: true,
      });

      // Clean up
      delete process.env.STTS_AUDIO_ENABLED;
      delete process.env.STTS_DEBUG;
    });
  });

  describe('getConfigValue', () => {
    it('should return config value', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      expect(getConfigValue('audioEnabled')).toBe(true);
      expect(getConfigValue('debug')).toBe(false);
    });

    it('should return default value when config value is undefined', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      expect(getConfigValue('nonExistent' as any, 'default')).toBe('default');
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge existing config with defaults', () => {
      const existingConfig = { audioEnabled: false };
      const merged = mergeWithDefaults(existingConfig);

      expect(merged).toEqual({
        audioEnabled: false,
        debug: false,
      });
    });

    it('should add missing defaults', () => {
      const existingConfig = {};
      const merged = mergeWithDefaults(existingConfig);

      expect(merged).toEqual({
        audioEnabled: true,
        debug: false,
      });
    });
  });
});
