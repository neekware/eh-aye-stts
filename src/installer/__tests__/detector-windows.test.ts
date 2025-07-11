import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock modules first
vi.mock('which');
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
  },
}));
vi.mock('../../utils/platform');
vi.mock('../../plugins/claude-code/settings');

// Then import
import { ToolDetector } from '../detector';
import which from 'which';
import { promises as fs } from 'fs';
import { isWindows, normalizePath, execCommand } from '../../utils/platform';
import { getClaudeSettingsPath, getClaudeSettingsDir } from '../../plugins/claude-code/settings';

describe('ToolDetector - Windows Support', () => {
  let detector: ToolDetector;

  // Get mocked functions
  const mockWhich = vi.mocked(which);
  const mockAccess = vi.mocked(fs.access);
  const mockIsWindows = vi.mocked(isWindows);
  const mockNormalizePath = vi.mocked(normalizePath);
  const mockExecCommand = vi.mocked(execCommand);
  const mockGetClaudeSettingsPath = vi.mocked(getClaudeSettingsPath);
  const mockGetClaudeSettingsDir = vi.mocked(getClaudeSettingsDir);

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mocks
    mockIsWindows.mockReturnValue(true);
    mockNormalizePath.mockImplementation((path: string) => path);
    mockExecCommand.mockRejectedValue(new Error('Command not found'));
    mockGetClaudeSettingsPath.mockReturnValue('C:\\Users\\test\\.claude\\settings.json');
    mockGetClaudeSettingsDir.mockReturnValue('C:\\Users\\test\\.claude');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Windows-specific detection', () => {
    beforeEach(() => {
      detector = new ToolDetector();
    });

    it('should detect Claude in LocalAppData on Windows', async () => {
      // Set environment variable first
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      process.env.PROGRAMFILES = 'C:\\Program Files';

      // Mock which to fail for both claude-code and claude
      mockWhich
        .mockRejectedValueOnce(new Error('not found')) // claude-code
        .mockRejectedValueOnce(new Error('not found')); // claude fallback

      // Mock fs.access to succeed for the LocalAppData path
      mockAccess.mockImplementation(async (path: string) => {
        // The actual path will be constructed using join() with these parts:
        // C:\\Users\\test\\AppData\\Local\\Programs\\claude\\claude.exe
        if (path.includes('Programs') && path.includes('claude') && path.includes('claude.exe')) {
          return Promise.resolve(undefined);
        }
        throw new Error('File not found');
      });

      const result = await detector.detect('claude-code');
      expect(result[0].detected).toBe(true);
    });

    it('should detect Claude via where command on Windows', async () => {
      // Mock which to fail
      mockWhich.mockRejectedValue(new Error('not found'));

      // Mock fs.access to fail for all paths
      mockAccess.mockRejectedValue(new Error('File not found'));

      // Mock successful where command
      mockExecCommand.mockResolvedValue({
        stdout: 'C:\\Users\\test\\scoop\\apps\\claude\\current\\claude.exe',
        stderr: '',
        code: 0,
      });

      const result = await detector.detect('claude-code');
      expect(result[0].detected).toBe(true);
    });

    it('should return false when Claude not found on Windows', async () => {
      // Mock which to fail
      mockWhich.mockRejectedValue(new Error('not found'));

      // Mock fs.access to fail
      mockAccess.mockRejectedValue(new Error('File not found'));

      // Mock failed where command
      mockExecCommand.mockResolvedValue({
        stdout: '',
        stderr: 'INFO: Could not find files for the given pattern(s).',
        code: 1,
      });

      const result = await detector.detect('claude-code');
      expect(result[0].detected).toBe(false);
    });
  });

  describe('Cross-platform detection', () => {
    it('should use standard which detection on non-Windows', async () => {
      // Mock as non-Windows
      mockIsWindows.mockReturnValue(false);

      detector = new ToolDetector();

      // Mock which to succeed
      mockWhich.mockResolvedValue('/usr/local/bin/claude');

      const result = await detector.detect('claude-code');
      expect(result[0].detected).toBe(true);
    });
  });

  describe('Private method: getRootDirectory', () => {
    beforeEach(() => {
      detector = new ToolDetector();
    });

    it('should extract Windows drive root correctly', () => {
      const getRootDirectory = (detector as any).getRootDirectory.bind(detector);

      expect(getRootDirectory('C:\\Users\\test\\project')).toBe('C:\\');
      expect(getRootDirectory('D:\\Projects\\myapp')).toBe('D:\\');
      expect(getRootDirectory('E:\\')).toBe('E:\\');
      expect(getRootDirectory('\\\\network\\share')).toBe('C:\\'); // Default for UNC
    });
  });
});
