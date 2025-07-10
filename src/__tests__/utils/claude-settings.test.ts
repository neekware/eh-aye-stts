import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClaudeSettingsPath, getClaudeSettingsDir } from '../../plugins/claude-code/settings';
import { join } from 'path';
import { homedir } from 'os';

describe('claude-settings', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getClaudeSettingsPath', () => {
    it('should return default path when no env var is set', () => {
      delete process.env.STTS_CLAUDE_SETTINGS_PATH;
      const path = getClaudeSettingsPath();
      expect(path).toBe(join(homedir(), '.claude', 'settings.json'));
    });

    it('should return custom path when env var is set', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = '/custom/path/settings.json';
      const path = getClaudeSettingsPath();
      expect(path).toBe('/custom/path/settings.json');
    });

    it('should handle relative paths in env var', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = './local/settings.json';
      const path = getClaudeSettingsPath();
      expect(path).toBe('./local/settings.json');
    });
  });

  describe('getClaudeSettingsDir', () => {
    it('should return default directory when no env var is set', () => {
      delete process.env.STTS_CLAUDE_SETTINGS_PATH;
      const dir = getClaudeSettingsDir();
      expect(dir).toBe(join(homedir(), '.claude'));
    });

    it('should extract directory from custom path', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = '/custom/path/settings.json';
      const dir = getClaudeSettingsDir();
      expect(dir).toBe('/custom/path');
    });

    it('should handle paths with multiple directories', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = '/a/b/c/d/settings.json';
      const dir = getClaudeSettingsDir();
      expect(dir).toBe('/a/b/c/d');
    });

    it('should handle paths without directory separator', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = 'settings.json';
      const dir = getClaudeSettingsDir();
      expect(dir).toBe('.');
    });

    it('should handle empty path', () => {
      process.env.STTS_CLAUDE_SETTINGS_PATH = '';
      const dir = getClaudeSettingsDir();
      expect(dir).toBe(join(homedir(), '.claude'));
    });
  });
});
