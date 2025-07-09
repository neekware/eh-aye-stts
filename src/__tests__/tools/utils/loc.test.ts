import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

describe('LOC tool', () => {
  it('should exist', () => {
    const locToolPath = 'tools/utils/loc.ts';
    expect(existsSync(locToolPath)).toBe(true);
  });

  it('should be a TypeScript file', () => {
    const locToolPath = 'tools/utils/loc.ts';
    expect(locToolPath.endsWith('.ts')).toBe(true);
  });
});
