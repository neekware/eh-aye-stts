import { vi } from 'vitest';

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// Mock path
vi.mock('path', () => ({
  dirname: vi.fn(() => '/test'),
  join: vi.fn((...args) => args.join('/')),
}));

// Mock chalk to avoid color codes in tests
vi.mock('chalk', () => ({
  default: {
    green: (str: string) => str,
    yellow: (str: string) => str,
    blue: (str: string) => str,
    red: (str: string) => str,
  },
}));

// Now import the module under test
import { SettingsManager } from '../../installer/settings-manager';
import { promises as fs } from 'fs';

// Get the mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockMkdir = vi.mocked(fs.mkdir);

describe('SettingsManager', () => {
  let manager: SettingsManager;
  const mockSettingsPath = '/test/.claude/settings.json';

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SettingsManager(mockSettingsPath);
  });

  describe('loadSettings', () => {
    it('should load existing settings', async () => {
      const mockSettings = { hooks: { Notification: [] } };
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettings) as any);

      const settings = await manager.loadSettings();

      expect(settings).toEqual(mockSettings);
      expect(mockReadFile).toHaveBeenCalledWith(mockSettingsPath, 'utf8');
    });

    it('should return empty object when file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const settings = await manager.loadSettings();

      expect(settings).toEqual({});
    });
  });

  describe('installHooks', () => {
    it('should install new hooks when none exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      mockMkdir.mockResolvedValue(undefined as any);
      mockWriteFile.mockResolvedValue(undefined as any);

      await manager.installHooks('/test/hooks');

      expect(mockWriteFile).toHaveBeenCalled();
      const savedSettings = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(savedSettings.hooks).toBeDefined();
      expect(savedSettings.hooks.PreToolUse).toBeDefined();
      expect(savedSettings.hooks.Notification).toBeDefined();
    });

    it('should not duplicate existing STTS hooks', async () => {
      const existingSettings = {
        hooks: {
          Notification: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'stts hook notification',
                },
              ],
            },
          ],
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingSettings) as any);

      const consoleSpy = vi.spyOn(console, 'log');
      await manager.installHooks('/test/hooks');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already installed'));
    });

    it('should preserve non-STTS hooks', async () => {
      const existingSettings = {
        hooks: {
          Notification: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'other-command',
                },
              ],
            },
          ],
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingSettings) as any);
      mockWriteFile.mockResolvedValue(undefined as any);

      await manager.installHooks('/test/hooks');

      const savedSettings = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(savedSettings.hooks.Notification).toHaveLength(2);
      expect(savedSettings.hooks.Notification[0].hooks[0].command).toBe('other-command');
    });
  });

  describe('removeHooks', () => {
    it('should remove only STTS hooks', async () => {
      const settings = {
        hooks: {
          Notification: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'stts hook notification',
                },
              ],
            },
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'other-command',
                },
              ],
            },
          ],
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(settings) as any);
      mockWriteFile.mockResolvedValue(undefined as any);

      await manager.removeHooks();

      expect(mockWriteFile).toHaveBeenCalled();
      const savedSettings = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(savedSettings.hooks.Notification).toHaveLength(1);
      expect(savedSettings.hooks.Notification[0].hooks[0].command).toBe('other-command');
    });

    it('should remove empty hook types after removing STTS hooks', async () => {
      const settings = {
        hooks: {
          Notification: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'stts hook notification',
                },
              ],
            },
          ],
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(settings) as any);
      mockWriteFile.mockResolvedValue(undefined as any);

      await manager.removeHooks();

      expect(mockWriteFile).toHaveBeenCalled();
      const savedSettings = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(savedSettings.hooks?.Notification).toBeUndefined();
    });

    it('should handle no hooks to remove', async () => {
      const settings = {}; // No hooks object at all
      mockReadFile.mockResolvedValue(JSON.stringify(settings) as any);

      const consoleSpy = vi.spyOn(console, 'log');
      await manager.removeHooks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found to remove'));
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
