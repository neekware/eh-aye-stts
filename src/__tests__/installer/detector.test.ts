import { vi } from 'vitest';
import { ToolDetector } from '../../installer/detector.js';

// Mock modules before importing
vi.mock('which', () => ({
  default: vi.fn()
}));
vi.mock('fs', () => ({
  promises: {
    access: vi.fn()
  }
}));
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/test')
}));

// Now import the mocked modules
import which from 'which';
import { promises as fs } from 'fs';
import { homedir } from 'os';

// Get the mocked functions
const mockWhich = vi.mocked(which);
const mockFsAccess = vi.mocked(fs.access);
const mockHomedir = vi.mocked(homedir);

describe('ToolDetector', () => {
  let detector: ToolDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new ToolDetector();
  });

  describe('detect', () => {
    it('should detect claude-code when executable exists', async () => {
      mockWhich.mockResolvedValueOnce('/usr/local/bin/claude-code');
      
      const results = await detector.detect('claude-code');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        name: 'Claude Code',
        executable: 'claude-code',
        detected: true
      });
    });

    it('should not detect claude-code when executable is missing', async () => {
      mockWhich.mockRejectedValueOnce(new Error('not found'));
      mockWhich.mockRejectedValueOnce(new Error('not found')); // Also mock the fallback to 'claude'
      
      const results = await detector.detect('claude-code');
      
      expect(results).toHaveLength(1);
      expect(results[0].detected).toBe(false);
    });

    it('should fall back to claude when claude-code is not found', async () => {
      mockWhich
        .mockRejectedValueOnce(new Error('not found')) // claude-code
        .mockResolvedValueOnce('/usr/local/bin/claude'); // claude fallback
      
      const results = await detector.detect('claude-code');
      
      expect(results[0].detected).toBe(true);
    });

    it('should detect all tools when no specific tool is provided', async () => {
      mockWhich
        .mockResolvedValueOnce('/usr/local/bin/claude-code')
        .mockResolvedValueOnce('/usr/local/bin/claude');
      
      const results = await detector.detect();
      
      expect(results.length).toBeGreaterThan(1);
      expect(results.every(r => r.detected)).toBe(true);
    });
  });

  describe('getSettingsPath', () => {
    it('should return settings path when file exists', async () => {
      mockFsAccess.mockResolvedValueOnce(undefined);
      
      const path = await detector.getSettingsPath('claude-code');
      
      expect(path).toBe('/home/test/.claude/settings.json');
    });

    it('should return null when settings file does not exist', async () => {
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));
      
      const path = await detector.getSettingsPath('claude-code');
      
      expect(path).toBeNull();
    });

    it('should return null for unknown tool', async () => {
      const path = await detector.getSettingsPath('unknown-tool');
      
      expect(path).toBeNull();
    });
  });
});