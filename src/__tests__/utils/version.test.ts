import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

// Mock import.meta.url
vi.stubGlobal('import.meta.url', 'file:///Users/test/project/src/utils/version.ts');

describe('version utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache to force re-evaluation
    vi.resetModules();
  });

  it('should read version from development package.json', async () => {
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify({ version: '1.2.3' }));

    const { VERSION } = await import('../../utils/version');

    expect(VERSION).toBe('1.2.3');
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('package.json'), 'utf-8');
  });

  it('should read version from production package.json if development fails', async () => {
    // First call fails (development path)
    vi.mocked(readFileSync).mockImplementationOnce(() => {
      throw new Error('File not found');
    });

    // Second call succeeds (production path)
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify({ version: '2.0.0' }));

    const { VERSION } = await import('../../utils/version');

    expect(VERSION).toBe('2.0.0');
    expect(readFileSync).toHaveBeenCalledTimes(2);
  });

  it('should return fallback version if both paths fail', async () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('File not found');
    });

    const { VERSION } = await import('../../utils/version');

    expect(VERSION).toBe('0.1.0');
    expect(readFileSync).toHaveBeenCalledTimes(2);
  });

  it('should return fallback version if package.json has no version field', async () => {
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify({ name: 'test-package' }));

    const { VERSION } = await import('../../utils/version');

    expect(VERSION).toBe('0.1.0');
  });

  it('should handle malformed package.json', async () => {
    vi.mocked(readFileSync).mockReturnValueOnce('not valid json');

    const { VERSION } = await import('../../utils/version');

    expect(VERSION).toBe('0.1.0');
  });
});
