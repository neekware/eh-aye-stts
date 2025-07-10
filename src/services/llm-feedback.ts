import { spawn } from 'child_process';
import { HookContext, ContextBuilder } from '../plugins/claude-code/hooks/context-builder';
import { getConfigValue } from '../utils/config';
import { MessageCache } from './message-cache';

export interface FeedbackOptions {
  maxWords?: number;
  style?: 'casual' | 'professional' | 'encouraging';
  includeSuggestions?: boolean;
}

export class LLMFeedbackGenerator {
  private static readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
  private static readonly CLAUDE_TIMEOUT = 30000; // 30 seconds

  private static readonly FALLBACK_MESSAGES: Record<string, string[]> = {
    'post-tool-use-success': [
      'Command completed',
      'Task finished',
      'Done',
      'All set',
      'Completed successfully',
    ],
    'post-tool-use-error': [
      'Command failed',
      'Error occurred',
      'Something went wrong',
      'Failed to complete',
      'Task unsuccessful',
    ],
    stop: ['Session ended', 'All done', 'Finished', 'Work complete', 'Session closed'],
    'subagent-stop-success': [
      'Agent task completed',
      'Subagent finished',
      'Task done',
      'Agent work complete',
    ],
    'subagent-stop-error': ['Agent task failed', 'Subagent error', 'Task unsuccessful'],
    notification: ['New notification', 'Update received', 'Status update'],
    error: ['Something went wrong', 'Error occurred', 'Failed'],
  };

  static async generateFeedback(
    context: HookContext,
    options: FeedbackOptions = {}
  ): Promise<string> {
    if (process.env.DEBUG) {
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.debug('[LLM] generateFeedback called with context:', {
        eventType: context.eventType,
        tool: context.tool,
        command: context.command?.substring(0, 100),
        result: context.result?.substring(0, 100),
        exitCode: context.exitCode,
        duration: context.duration,
      });
      console.debug('[LLM] Options:', options);
    }

    // Check if LLM is enabled
    const llmEnabled = getConfigValue('llmEnabled', true);
    if (!llmEnabled) {
      if (process.env.DEBUG) {
        console.debug('[LLM] LLM is disabled, using fallback message');
      }
      return this.getFallbackMessage(context);
    }

    // Check cache first
    const cacheEnabled = getConfigValue('llmCacheEnabled', true);
    if (cacheEnabled) {
      const cacheKey = MessageCache.getCacheKey(context);
      const cached = MessageCache.get(cacheKey);
      if (cached) {
        if (process.env.DEBUG) {
          console.debug('[LLM] Found cached message:', cached);
        }
        return cached;
      }
    }

    // Check if Claude CLI is available
    if (!(await this.isClaudeAvailable())) {
      if (process.env.DEBUG) {
        console.debug('[LLM] Claude CLI not available, using fallback');
      }
      return this.getFallbackMessage(context);
    }

    const prompt = this.buildPrompt(context, options);
    if (process.env.DEBUG) {
      console.debug('[LLM] Generated prompt:');
      console.debug('---PROMPT START---');
      console.debug(prompt);
      console.debug('---PROMPT END---');
    }

    // Store the prompt for cache debugging
    MessageCache.setLastPrompt(prompt);

    try {
      const message = await this.callClaude(prompt);

      // Cache the result with prompt
      if (cacheEnabled && message) {
        const cacheKey = MessageCache.getCacheKey(context);
        MessageCache.set(cacheKey, message, prompt);
        if (process.env.DEBUG) {
          console.debug('[LLM] Cached message with key:', cacheKey);
        }
      }

      return message || this.getFallbackMessage(context);
    } catch (error) {
      if (process.env.DEBUG) {
        console.debug('[LLM] Claude CLI failed:', error);
      }
      return this.getFallbackMessage(context);
    }
  }

  private static buildPrompt(context: HookContext, options: FeedbackOptions): string {
    const { maxWords = 10, style = 'casual' } = options;
    const contextSummary = ContextBuilder.getContextSummary(context);

    let prompt = `Generate a ${maxWords} word or less ${style} conversational feedback message.

Context: ${contextSummary}

Rules:
- Be conversational and natural
- Maximum ${maxWords} words
- No punctuation at the end
- Focus on the outcome, not technical details
- If successful, be encouraging
- If failed, be supportive
- Avoid technical jargon
- Be concise and clear`;

    // Add specific guidance for documentation updates
    if (context.tool === 'MultiEdit' && context.command?.toLowerCase().includes('doc')) {
      prompt += '\n- Keep it simple like "Added those docs" or "Docs updated"';
    }

    // Add event-specific guidance
    switch (context.eventType) {
      case 'post-tool-use':
        if (context.duration && context.duration > 30000) {
          prompt += '\n- Acknowledge the long wait time positively';
        }
        // Add specific guidance for documentation updates
        if (context.tool === 'Write' && context.command?.includes('doc')) {
          prompt += '\n- Mention the documentation update naturally';
          prompt +=
            '\n- Example: "Hey, I added those docs you wanted" instead of verbose descriptions';
        }
        break;
      case 'stop':
        if (context.errorCount && context.errorCount > 0) {
          prompt += '\n- Acknowledge challenges but stay positive';
        } else if (context.successCount && context.successCount > 10) {
          prompt += '\n- Acknowledge productive session';
        }
        break;
      case 'subagent-stop':
        prompt += '\n- Reference the agent or assistant completing work';
        break;
    }

    prompt += '\n\nRespond with ONLY the feedback message, nothing else.';

    // Debug logging
    if (process.env.DEBUG) {
      console.debug('[LLM] Generated prompt:', prompt);
    }

    return prompt;
  }

  private static async callClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const model = getConfigValue('llmModel', this.DEFAULT_MODEL);
      const args = ['-p', prompt, '--model', model];

      if (process.env.DEBUG) {
        console.debug('[LLM] Calling Claude CLI with model:', model);
        console.debug('[LLM] Command:', 'claude', args.join(' '));
      }

      const claude = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDE_NO_COLOR: '1' },
      });

      // Close stdin immediately since we're using -p flag, not piping
      claude.stdin.end();

      let output = '';
      let error = '';

      claude.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      claude.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      claude.on('close', (code) => {
        if (code === 0) {
          // Clean the output - remove any extra whitespace or newlines
          const cleaned = output.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

          if (process.env.DEBUG) {
            console.debug('[LLM] Raw output:', output);
            console.debug('[LLM] Cleaned output:', cleaned);
          }

          resolve(cleaned);
        } else {
          if (process.env.DEBUG) {
            console.debug('[LLM] Claude CLI failed with code:', code);
            console.debug('[LLM] Error output:', error);
          }
          reject(new Error(`Claude CLI failed with code ${code}: ${error}`));
        }
      });

      claude.on('error', (err) => {
        if (process.env.DEBUG) {
          console.debug('[LLM] Claude spawn error:', err);
        }
        reject(err);
      });

      // Timeout
      setTimeout(() => {
        claude.kill();
        if (process.env.DEBUG) {
          console.debug('[LLM] Claude CLI timeout after', this.CLAUDE_TIMEOUT, 'ms');
        }
        reject(new Error('Claude CLI timeout'));
      }, this.CLAUDE_TIMEOUT);
    });
  }

  private static async isClaudeAvailable(): Promise<boolean> {
    try {
      return await new Promise<boolean>((resolve) => {
        const claude = spawn('claude', ['--version'], {
          stdio: 'ignore',
        });

        claude.on('close', (code) => {
          resolve(code === 0);
        });

        claude.on('error', () => {
          resolve(false);
        });

        // Quick timeout for version check
        setTimeout(() => {
          claude.kill();
          resolve(false);
        }, 1000);
      });
    } catch {
      return false;
    }
  }

  private static getFallbackMessage(context: HookContext): string {
    let messageKey = context.eventType;

    // Add success/error suffix for certain events
    if (context.eventType === 'post-tool-use' || context.eventType === 'subagent-stop') {
      const isSuccess = context.exitCode === 0;
      messageKey = `${context.eventType}-${isSuccess ? 'success' : 'error'}`;
    }

    const messages = this.FALLBACK_MESSAGES[messageKey] || this.FALLBACK_MESSAGES['error'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  static async generateSessionSummary(context: HookContext): Promise<string> {
    if (
      !context.sessionDuration ||
      context.errorCount === undefined ||
      context.successCount === undefined
    ) {
      return 'Session complete';
    }

    const minutes = Math.round(context.sessionDuration / 60000);
    const hasErrors = context.errorCount > 0;

    return this.generateFeedback(
      {
        ...context,
        command: `Session: ${minutes} minutes, ${context.successCount} successes, ${context.errorCount} errors`,
      },
      {
        maxWords: 12,
        style: hasErrors ? 'encouraging' : 'casual',
      }
    );
  }
}
