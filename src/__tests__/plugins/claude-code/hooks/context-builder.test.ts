import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ContextBuilder, HookContext } from '../../../../plugins/claude-code/hooks/context-builder';
import { LogReader } from '../../../../plugins/claude-code/hooks/log-reader';
import * as projectUtils from '../../../../utils/project';

vi.mock('../../../../plugins/claude-code/hooks/log-reader');
vi.mock('../../../../utils/project');

describe('ContextBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectUtils.getProjectName).mockReturnValue('test-project');
  });

  describe('buildContext', () => {
    it('should build context for post-tool-use event', async () => {
      const event = {
        type: 'post-tool-use',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          tool: 'bash',
          args: { command: 'npm test' },
          result: 'All tests passed',
          exitCode: 0,
          duration: 5000,
          cwd: '/test/dir',
        },
      };

      const context = await ContextBuilder.buildContext(event);

      expect(context).toEqual({
        eventType: 'post-tool-use',
        timestamp: '2024-01-01T00:00:00Z',
        projectName: 'test-project',
        cwd: expect.any(String),
        tool: 'bash',
        command: 'npm test',
        result: 'All tests passed',
        exitCode: 0,
        duration: 5000,
      });
    });

    it('should truncate long results', async () => {
      const longResult = 'a'.repeat(600);
      const event = {
        type: 'post-tool-use',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          tool: 'bash',
          args: 'ls -la',
          result: longResult,
          exitCode: 0,
          duration: 1000,
          cwd: '/test/dir',
        },
      };

      const context = await ContextBuilder.buildContext(event);

      expect(context.result).toHaveLength(503); // 500 + '...'
      expect(context.result?.endsWith('...')).toBe(true);
    });

    it('should handle various args formats', async () => {
      const testCases = [
        { args: 'simple command', expected: 'simple command' },
        { args: ['npm', 'run', 'test'], expected: 'npm run test' },
        { args: { command: 'git status' }, expected: 'git status' },
        { args: { other: 'data' }, expected: '' },
      ];

      for (const { args, expected } of testCases) {
        const event = {
          type: 'pre-tool-use',
          timestamp: '2024-01-01T00:00:00Z',
          data: {
            tool: 'bash',
            args,
            cwd: '/test/dir',
          },
        };

        const context = await ContextBuilder.buildContext(event);
        expect(context.command).toBe(expected);
      }
    });

    it('should build context for stop event with session summary', async () => {
      const mockRecentEvents = [
        { type: 'post-tool-use', timestamp: '2024-01-01T00:00:00Z', data: {} },
      ];

      const mockSummary = {
        totalCommands: 10,
        errors: 2,
        successes: 8,
        duration: 300000,
        mostUsedTools: ['bash', 'npm', 'git'],
      };

      vi.mocked(LogReader.loadRecentEvents).mockResolvedValue(mockRecentEvents);
      vi.mocked(LogReader.getSessionSummary).mockResolvedValue(mockSummary);

      const event = {
        type: 'stop',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          exitCode: 0,
          reason: 'User exit',
        },
      };

      const context = await ContextBuilder.buildContext(event);

      expect(context).toMatchObject({
        eventType: 'stop',
        exitCode: 0,
        recentEvents: mockRecentEvents,
        sessionDuration: 300000,
        errorCount: 2,
        successCount: 8,
        mostUsedTools: ['bash', 'npm', 'git'],
      });
    });

    it('should build context for subagent-stop event', async () => {
      const event = {
        type: 'subagent-stop',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          agentId: 'agent-123',
          reason: 'Task completed',
          taskDescription: 'Run tests',
          duration: 15000,
          success: true,
        },
      };

      const context = await ContextBuilder.buildContext(event);

      expect(context).toMatchObject({
        eventType: 'subagent-stop',
        duration: 15000,
        command: 'Run tests',
        exitCode: 0, // success: true -> exitCode: 0
      });
    });

    it('should build context for notification event', async () => {
      const event = {
        type: 'notification',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          message: 'Build completed successfully',
          type: 'success',
          level: 'info',
        },
      };

      const context = await ContextBuilder.buildContext(event);

      expect(context).toMatchObject({
        eventType: 'notification',
        command: 'Build completed successfully',
      });
    });
  });

  describe('getContextSummary', () => {
    it('should create a summary string from context', () => {
      const context: HookContext = {
        eventType: 'post-tool-use',
        timestamp: '2024-01-01T00:00:00Z',
        tool: 'npm',
        command: 'npm run build',
        exitCode: 0,
        duration: 45000,
        projectName: 'test-project',
        cwd: '/test/dir',
      };

      const summary = ContextBuilder.getContextSummary(context);

      expect(summary).toBe('Tool: npm, Command: npm run build, Status: Success, Duration: 45s');
    });

    it('should handle long commands', () => {
      const context: HookContext = {
        eventType: 'post-tool-use',
        timestamp: '2024-01-01T00:00:00Z',
        tool: 'bash',
        command:
          'a very long command that exceeds the maximum length and should be truncated properly',
        exitCode: 1,
        projectName: 'test-project',
        cwd: '/test/dir',
      };

      const summary = ContextBuilder.getContextSummary(context);

      expect(summary).toContain('Tool: bash');
      expect(summary).toContain('Status: Failed');
      expect(summary).toContain('...');
    });

    it('should include session summary for stop events', () => {
      const context: HookContext = {
        eventType: 'stop',
        timestamp: '2024-01-01T00:00:00Z',
        projectName: 'test-project',
        cwd: '/test/dir',
        errorCount: 2,
        successCount: 10,
      };

      const summary = ContextBuilder.getContextSummary(context);

      expect(summary).toBe('Session: 10 successes, 2 errors');
    });

    it('should handle minimal context', () => {
      const context: HookContext = {
        eventType: 'notification',
        timestamp: '2024-01-01T00:00:00Z',
        projectName: 'test-project',
        cwd: '/test/dir',
      };

      const summary = ContextBuilder.getContextSummary(context);

      expect(summary).toBe('');
    });
  });
});
