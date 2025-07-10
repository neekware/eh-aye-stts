import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LLMFeedbackGenerator } from '../../services/llm-feedback';
import { HookContext } from '../../plugins/claude-code/hooks/context-builder';
import { MessageCache } from '../../services/message-cache';
import * as child_process from 'child_process';
import * as config from '../../utils/config';

vi.mock('child_process');
vi.mock('../../utils/config');
vi.mock('../../services/message-cache');

describe('LLMFeedbackGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MessageCache.clear();
    vi.mocked(config.getConfigValue).mockImplementation((key: string, defaultValue: any) => {
      if (key === 'llmEnabled') return true;
      if (key === 'llmCacheEnabled') return true;
      if (key === 'llmMaxWords') return 10;
      if (key === 'llmStyle') return 'casual';
      if (key === 'llmModel') return 'claude-3-5-sonnet-20241022';
      return defaultValue;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateFeedback', () => {
    const mockContext: HookContext = {
      eventType: 'post-tool-use',
      timestamp: new Date().toISOString(),
      tool: 'build',
      exitCode: 0,
      duration: 45000,
      projectName: 'test-project',
      cwd: '/test/dir',
    };

    it('should generate feedback using Claude CLI when available', async () => {
      const mockSpawn = vi.fn();
      const mockProcess = {
        stdin: {
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Build crushed it'));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(child_process.spawn).mockReturnValue(mockProcess as any);

      const result = await LLMFeedbackGenerator.generateFeedback(mockContext);

      expect(result).toBe('Build crushed it');
      expect(child_process.spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', expect.any(String), '--model', 'claude-3-5-sonnet-20241022']),
        expect.any(Object)
      );
    });

    it('should use fallback message when LLM is disabled', async () => {
      vi.mocked(config.getConfigValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'llmEnabled') return false;
        return defaultValue;
      });

      const result = await LLMFeedbackGenerator.generateFeedback(mockContext);

      expect(result).toMatch(/Command completed|Task finished|Done|All set|Completed successfully/);
      expect(child_process.spawn).not.toHaveBeenCalled();
    });

    it('should use cached response when available', async () => {
      const cachedMessage = 'Cached success message';
      vi.mocked(MessageCache.get).mockReturnValue(cachedMessage);

      const result = await LLMFeedbackGenerator.generateFeedback(mockContext);

      expect(result).toBe(cachedMessage);
      expect(child_process.spawn).not.toHaveBeenCalled();
    });

    it('should handle Claude CLI failures gracefully', async () => {
      const mockSpawn = vi.fn();
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Non-zero exit code
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(child_process.spawn).mockReturnValue(mockProcess as any);

      const result = await LLMFeedbackGenerator.generateFeedback(mockContext);

      expect(result).toMatch(/Command completed|Task finished|Done|All set|Completed successfully/);
    });

    it('should handle different event types', async () => {
      const errorContext: HookContext = {
        ...mockContext,
        exitCode: 1,
      };

      const result = await LLMFeedbackGenerator.generateFeedback(errorContext);

      expect(result).toMatch(
        /Command failed|Error occurred|Something went wrong|Failed to complete|Task unsuccessful/
      );
    });

    it('should respect max words configuration', async () => {
      vi.mocked(config.getConfigValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'llmEnabled') return true;
        if (key === 'llmMaxWords') return 5;
        if (key === 'llmStyle') return 'professional';
        return defaultValue;
      });

      const mockSpawn = vi.fn();
      vi.mocked(child_process.spawn).mockImplementation((command, args) => {
        const prompt = args?.[1] as string;
        expect(prompt).toContain('5 word or less');
        expect(prompt).toContain('professional');

        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') callback(0);
          }),
          kill: vi.fn(),
        } as any;
      });

      await LLMFeedbackGenerator.generateFeedback(mockContext);
    });
  });

  describe('generateSessionSummary', () => {
    it('should generate session summary with context', async () => {
      const sessionContext: HookContext = {
        eventType: 'stop',
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        cwd: '/test/dir',
        sessionDuration: 300000, // 5 minutes
        errorCount: 2,
        successCount: 10,
      };

      const mockSpawn = vi.fn();
      const mockProcess = {
        stdin: {
          end: vi.fn(),
        },
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Great session today'));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
        kill: vi.fn(),
      };

      vi.mocked(child_process.spawn).mockReturnValue(mockProcess as any);

      const result = await LLMFeedbackGenerator.generateSessionSummary(sessionContext);

      expect(result).toBe('Great session today');
      expect(child_process.spawn).toHaveBeenCalled();
    });

    it('should return default message when no session data', async () => {
      const context: HookContext = {
        eventType: 'stop',
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        cwd: '/test/dir',
      };

      const result = await LLMFeedbackGenerator.generateSessionSummary(context);

      expect(result).toBe('Session complete');
    });
  });
});
