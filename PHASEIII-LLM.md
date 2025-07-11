# PHASE III: LLM Integration for Dynamic Conversational Feedback

## Overview

This document outlines the design for integrating LLM-generated conversational feedback into eh-aye-stts. The goal is to transform static audio notifications into dynamic, context-aware responses that provide meaningful feedback based on Claude Code's activities.

## Architecture Overview

```
Hook Event → Context Extraction → LLM Processing → Audio Generation
    ↓              ↓                    ↓               ↓
JSON Input    Log Analysis      Claude CLI Call    TTS Announce
```

## 1. Context Extraction System

### 1.1 Enhanced Hook Data Capture

Extend existing hooks to capture richer context:

```typescript
// src/plugins/claude-code/hooks/context-builder.ts
export interface HookContext {
  // Core event data
  eventType: string;
  timestamp: string;
  tool?: string;

  // Execution context
  command?: string;
  result?: string;
  exitCode?: number;
  duration?: number;

  // Project context
  projectName: string;
  cwd: string;

  // Aggregated context
  recentEvents?: HookEvent[];
  sessionDuration?: number;
  errorCount?: number;
}

export class ContextBuilder {
  private static readonly MAX_CONTEXT_LENGTH = 500; // chars
  private static readonly RECENT_EVENTS_COUNT = 5;

  static async buildContext(event: HookEvent): Promise<HookContext> {
    const context: HookContext = {
      eventType: event.type,
      timestamp: event.timestamp,
      projectName: getProjectName(),
      cwd: process.cwd(),
    };

    // Extract event-specific data
    switch (event.type) {
      case 'post-tool-use':
        const postEvent = event.data as PostToolUseEvent;
        context.tool = postEvent.tool;
        context.command = this.extractCommand(postEvent);
        context.result = this.truncateResult(postEvent.result);
        context.exitCode = postEvent.exitCode;
        context.duration = postEvent.duration;
        break;

      case 'stop':
        // Load recent events from logs for session summary
        context.recentEvents = await this.loadRecentEvents();
        context.sessionDuration = this.calculateSessionDuration(context.recentEvents);
        context.errorCount = this.countErrors(context.recentEvents);
        break;
    }

    return context;
  }

  private static extractCommand(event: PostToolUseEvent): string {
    if (typeof event.args === 'string') return event.args;
    if (Array.isArray(event.args)) return event.args.join(' ');
    if (event.args?.command) return event.args.command;
    return '';
  }

  private static truncateResult(result: string | Buffer): string {
    const str = result.toString();
    if (str.length <= this.MAX_CONTEXT_LENGTH) return str;
    return str.substring(0, this.MAX_CONTEXT_LENGTH) + '...';
  }
}
```

### 1.2 Log Aggregation

Read and aggregate logs to build session context:

```typescript
// src/plugins/claude-code/hooks/log-reader.ts
export class LogReader {
  static async loadRecentEvents(count = 5): Promise<HookEvent[]> {
    const logFile = join(LOGS_DIR, getProjectName(), 'hook-events.json');

    try {
      const logs = await fs.readFile(logFile, 'utf-8');
      const lines = logs.trim().split('\n');

      // Get last N events
      return lines
        .slice(-count)
        .map((line) => JSON.parse(line))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  static async getSessionSummary(): Promise<SessionSummary> {
    const events = await this.loadRecentEvents(50);

    return {
      totalCommands: events.filter((e) => e.type === 'post-tool-use').length,
      errors: events.filter((e) => e.data?.exitCode !== 0).length,
      duration: this.calculateDuration(events),
      mostUsedTools: this.getMostUsedTools(events),
    };
  }
}
```

## 2. LLM Integration via Claude CLI

### 2.1 Feedback Generator Service

```typescript
// src/services/llm-feedback.ts
import { spawn } from 'child_process';
import { ContextBuilder, HookContext } from '../plugins/claude-code/hooks/context-builder';

export interface FeedbackOptions {
  maxWords?: number;
  style?: 'casual' | 'professional' | 'encouraging';
  includeSuggestions?: boolean;
}

export class LLMFeedbackGenerator {
  private static readonly DEFAULT_MODEL = 'claude-sonnet-4-20250514';
  private static readonly FALLBACK_MESSAGES = {
    'post-tool-use': ['Command completed', 'Task finished', 'Done'],
    stop: ['Session ended', 'All done', 'Finished'],
    error: ['Something went wrong', 'Error occurred', 'Failed'],
  };

  static async generateFeedback(
    context: HookContext,
    options: FeedbackOptions = {}
  ): Promise<string> {
    // Check if Claude CLI is available
    if (!(await this.isClaudeAvailable())) {
      return this.getFallbackMessage(context);
    }

    const prompt = this.buildPrompt(context, options);

    try {
      return await this.callClaude(prompt);
    } catch (error) {
      console.debug('Claude CLI failed, using fallback:', error);
      return this.getFallbackMessage(context);
    }
  }

  private static buildPrompt(context: HookContext, options: FeedbackOptions): string {
    const { maxWords = 10, style = 'casual' } = options;

    let prompt = `Generate a ${maxWords} word or less ${style} conversational feedback message for this context:\n\n`;

    // Add context details
    if (context.tool) {
      prompt += `Tool: ${context.tool}\n`;
    }
    if (context.command) {
      prompt += `Command: ${context.command}\n`;
    }
    if (context.exitCode !== undefined) {
      prompt += `Status: ${context.exitCode === 0 ? 'Success' : 'Failed'}\n`;
    }
    if (context.duration) {
      prompt += `Duration: ${Math.round(context.duration / 1000)}s\n`;
    }
    if (context.errorCount) {
      prompt += `Errors in session: ${context.errorCount}\n`;
    }

    prompt += `\nRules:
- Be conversational and natural
- Maximum ${maxWords} words
- No punctuation at the end
- Focus on the outcome, not the technical details
- If successful, be encouraging
- If failed, be supportive`;

    return prompt;
  }

  private static async callClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['-p', prompt, '--model', this.DEFAULT_MODEL];

      const claude = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      claude.stdout.on('data', (data) => {
        output += data.toString();
      });

      claude.stderr.on('data', (data) => {
        error += data.toString();
      });

      claude.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Claude CLI failed: ${error}`));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        claude.kill();
        reject(new Error('Claude CLI timeout'));
      }, 5000);
    });
  }

  private static async isClaudeAvailable(): Promise<boolean> {
    try {
      const result = await new Promise<boolean>((resolve) => {
        const claude = spawn('claude', ['--version'], {
          stdio: 'ignore',
        });

        claude.on('close', (code) => {
          resolve(code === 0);
        });

        claude.on('error', () => {
          resolve(false);
        });
      });

      return result;
    } catch {
      return false;
    }
  }

  private static getFallbackMessage(context: HookContext): string {
    const messages = this.FALLBACK_MESSAGES[context.eventType] || ['Done'];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
```

### 2.2 Configuration

Add LLM configuration options:

```typescript
// src/types.ts
export interface STTSConfig {
  // Existing config...
  audioEnabled: boolean;

  // New LLM options
  llmEnabled?: boolean;
  llmModel?: string;
  llmStyle?: 'casual' | 'professional' | 'encouraging';
  llmMaxWords?: number;
  llmCacheEnabled?: boolean;
  llmCacheTTL?: number; // seconds
}
```

## 3. Enhanced Hook Integration

### 3.1 Updated Hook Implementation

```typescript
// src/plugins/claude-code/hooks/post-tool-use.ts
import { BaseHook } from './base';
import { PostToolUseEvent } from '../types';
import { ContextBuilder } from './context-builder';
import { LLMFeedbackGenerator } from '../../../services/llm-feedback';
import { announceIfEnabled } from '../../../tts/announce';
import { detectEmotion } from '../../../tts/emotion-detector';
import { getConfigValue } from '../../../utils/config';

export class PostToolUseHook extends BaseHook {
  async execute(): Promise<void> {
    const input = await this.readStdin();
    if (!input) return;

    const event = this.parseInput(input) as PostToolUseEvent;
    if (!event) return;

    // Log the event
    this.logEvent({
      type: 'post-tool-use',
      timestamp: new Date().toISOString(),
      data: event,
    });

    // Only announce for significant events
    if (!this.shouldAnnounce(event)) return;

    // Build context
    const context = await ContextBuilder.buildContext({
      type: 'post-tool-use',
      timestamp: new Date().toISOString(),
      data: event,
    });

    // Generate feedback
    const message = await this.generateMessage(context);
    const emotion = this.determineEmotion(event);

    // Announce
    await announceIfEnabled(message, emotion);
  }

  private shouldAnnounce(event: PostToolUseEvent): boolean {
    // Announce long-running commands (>5s)
    if (event.duration && event.duration > 5000) return true;

    // Announce failures
    if (event.exitCode !== 0) return true;

    // Announce specific important tools
    const importantTools = ['build', 'test', 'deploy', 'install'];
    if (importantTools.includes(event.tool.toLowerCase())) return true;

    return false;
  }

  private async generateMessage(context: HookContext): Promise<string> {
    const llmEnabled = getConfigValue('llmEnabled', true);

    if (!llmEnabled) {
      return this.getStaticMessage(context);
    }

    return await LLMFeedbackGenerator.generateFeedback(context, {
      maxWords: getConfigValue('llmMaxWords', 10),
      style: getConfigValue('llmStyle', 'casual'),
    });
  }

  private getStaticMessage(context: HookContext): string {
    // Existing static message logic
    const toolName = this.getToolDisplayName(context.tool || '');
    const seconds = Math.round((context.duration || 0) / 1000);

    if (context.exitCode === 0) {
      return `${toolName} completed in ${seconds} seconds`;
    } else {
      return `${toolName} failed with error`;
    }
  }

  private determineEmotion(event: PostToolUseEvent): Emotion {
    if (event.exitCode === 0) {
      return event.duration && event.duration > 10000 ? 'relieved' : 'cheerful';
    } else {
      return 'concerned';
    }
  }
}
```

## 4. Message Caching

To avoid excessive LLM calls:

```typescript
// src/services/message-cache.ts
export class MessageCache {
  private static cache = new Map<string, { message: string; timestamp: number }>();
  private static readonly DEFAULT_TTL = 300; // 5 minutes

  static getCacheKey(context: HookContext): string {
    return `${context.eventType}-${context.tool}-${context.exitCode}`;
  }

  static get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = getConfigValue('llmCacheTTL', this.DEFAULT_TTL) * 1000;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.message;
  }

  static set(key: string, message: string): void {
    this.cache.set(key, {
      message,
      timestamp: Date.now(),
    });
  }
}
```

## 5. Implementation Checklist

Following LEVER principles (Score: 8/10):

- **L**ocate: ✓ Use existing hook system, TTS infrastructure
- **E**xtend: ✓ Extend BaseHook, enhance announce system
- **V**alidate: ✓ Maintain backward compatibility with fallbacks
- **E**nhance: ✓ Add LLM capabilities, context awareness
- **R**educe: ✓ Reuse Claude CLI, minimize new dependencies

### Implementation Steps:

1. **Phase 1: Context Building**
   - [ ] Create ContextBuilder class
   - [ ] Add LogReader for session aggregation
   - [ ] Enhance hook data capture

2. **Phase 2: LLM Integration**
   - [ ] Create LLMFeedbackGenerator service
   - [ ] Add Claude CLI wrapper
   - [ ] Implement fallback system

3. **Phase 3: Hook Updates**
   - [ ] Update PostToolUseHook with LLM calls
   - [ ] Update StopHook for session summaries
   - [ ] Add configuration options

4. **Phase 4: Optimization**
   - [ ] Implement message caching
   - [ ] Add performance monitoring
   - [ ] Create debug logging

## 6. Usage Examples

### Basic Usage

```bash
# Enable LLM feedback
stts config set llmEnabled true

# Configure style
stts config set llmStyle casual
stts config set llmMaxWords 8
```

### Example Outputs

**Successful Build:**

- Static: "Build completed in 45 seconds"
- LLM: "Nice! Build crushed it"

**Failed Test:**

- Static: "Test failed with error"
- LLM: "Tests need some love"

**Long Running Task:**

- Static: "Command completed in 120 seconds"
- LLM: "Finally done, great patience"

**Session End:**

- Static: "Session completed"
- LLM: "Great coding session today"

## 7. Testing Strategy

```typescript
// src/__tests__/services/llm-feedback.test.ts
describe('LLMFeedbackGenerator', () => {
  it('should generate feedback via Claude CLI', async () => {
    const context: HookContext = {
      eventType: 'post-tool-use',
      tool: 'build',
      exitCode: 0,
      duration: 45000,
    };

    const message = await LLMFeedbackGenerator.generateFeedback(context);
    expect(message).toBeTruthy();
    expect(message.split(' ').length).toBeLessThanOrEqual(10);
  });

  it('should use fallback when Claude unavailable', async () => {
    // Mock Claude CLI as unavailable
    const message = await LLMFeedbackGenerator.generateFeedback(context);
    expect(['Command completed', 'Task finished', 'Done']).toContain(message);
  });
});
```

## 8. Future Enhancements

1. **Advanced Context**: Include git status, file changes
2. **Learning**: Track user preferences, adapt style
3. **Multi-LLM**: Support OpenAI, Anthropic APIs directly
4. **Streaming**: Real-time feedback during execution
5. **Custom Prompts**: User-defined prompt templates
